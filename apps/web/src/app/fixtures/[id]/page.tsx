import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import type { FixtureContext } from '@/lib/api-client';
import { formatTime, formatDateLabel } from '@/lib/format';
import { LiveBadge } from '@/components/match/live-badge';
import { ScoreDisplay } from '@/components/match/score-display';
import { AiPredictionPanel } from '@/components/prediction/ai-prediction-panel';
import type { FixtureDetail } from '@ai-score/shared';
import { ContextDisplay } from './display';
import { FixtureLabels, FixtureEventsWrapper, TeamBlockClient } from './fixture-labels';
import { getEspnH2H, getEspnTeamForm } from '@/lib/espn';
import { getVenue } from '@/lib/venues-wc2026';
import { cookies } from 'next/headers';
import { STATIC_MODE } from '@/lib/lvs-data';

interface Props {
  params: Promise<{ id: string }>;
}

// Статический экспорт требует generateStaticParams у динамического роута.
// Отдаём один заглушечный путь (страница сама уйдёт в notFound без бэкенда).
// В dev dynamicParams по умолчанию true → реальные страницы матчей работают.
export function generateStaticParams() {
  return [{ id: '0' }];
}

export default async function FixturePage({ params }: Props) {
  const { id } = await params;
  const fixtureId = parseInt(id, 10);
  if (isNaN(fixtureId)) notFound();
  // Статический экспорт (GitHub Pages): детальных страниц матчей нет — бэкенда
  // для них нет. Заглушечный /fixtures/0 уходит в 404 без сетевого запроса.
  if (STATIC_MODE) notFound();

  let fixture: FixtureDetail;
  try {
    fixture = await api.fixtures.get(fixtureId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const isLive = fixture.status === 'live';
  const isFinished = fixture.status === 'finished';
  const hasStarted = isLive || isFinished;

  // Show the saved analysis if one exists (the user already ran it); only when
  // there's no analysis yet do we show the «Сделать анализ» button. After the
  // match, settle the bet so the verdict is shown.
  let prediction = fixture.prediction;
  if (isFinished && prediction && !prediction.settlement) {
    const settled = await settlePrediction(fixtureId);
    if (settled) prediction = settled;
  }
  const initialPrediction = prediction;

  const staticVenue = getVenue(fixtureId);
  const venueInfo = fixture.venue ?? (staticVenue ? {
    name: staticVenue.stadium,
    city: `${staticVenue.city}, ${staticVenue.country}`,
  } : null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      {/* Back */}
      <FixtureLabels type="back" />

      {/* Match header */}
      <div className="overflow-hidden rounded-2xl" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}>
        <div className="flex items-center gap-2 px-5 py-2.5" style={{ borderBottom: '1px solid rgb(var(--pitch-700))' }}>
          {fixture.league.logo && <img src={fixture.league.logo} alt="" className="h-4 w-4 object-contain" />}
          <span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{fixture.league.name}</span>
          {fixture.round && <><span style={{ color: 'rgb(var(--pitch-600))' }}>·</span><span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{fixture.round}</span></>}
        </div>

        <div className="px-5 py-8">
          <div className="flex items-center gap-4">
            <TeamBlockClient name={fixture.homeTeam.name} shortName={fixture.homeTeam.shortName} logo={fixture.homeTeam.logo}
              bold={isFinished && fixture.score !== null && fixture.score.home > fixture.score.away} />
            <div className="shrink-0 text-center">
              {hasStarted && fixture.score ? (
                <ScoreDisplay score={fixture.score} className="justify-center text-3xl" />
              ) : (
                <div>
                  <div className="tabular text-2xl font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{formatTime(fixture.startsAt)}</div>
                  <div className="mt-0.5 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{formatDateLabel(fixture.startsAt)}</div>
                </div>
              )}
              {isLive && <div className="mt-2 flex justify-center"><LiveBadge minute={fixture.minute} /></div>}
              {isFinished && <FixtureLabels type="finished-badge" />}
            </div>
            <TeamBlockClient name={fixture.awayTeam.name} shortName={fixture.awayTeam.shortName} logo={fixture.awayTeam.logo} align="right"
              bold={isFinished && fixture.score !== null && fixture.score.away > fixture.score.home} />
          </div>
          {fixture.score?.halfTime && (
            <FixtureLabels type="halftime" home={fixture.score.halfTime.home} away={fixture.score.halfTime.away} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 px-5 py-3 text-xs" style={{ borderTop: '1px solid rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateLabel(fixture.startsAt)}, {formatTime(fixture.startsAt)} <FixtureLabels type="msk" />
          </span>
          {venueInfo && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {venueInfo.name}{venueInfo.city ? `, ${venueInfo.city}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* AI Prediction — on-demand run (free in test phase) */}
      <AiPredictionPanel fixtureId={fixtureId} initialPrediction={initialPrediction} />

      {/* Events */}
      {fixture.events.length > 0 && (
        <FixtureEventsWrapper events={fixture.events} />
      )}

      {/* Context */}
      <Suspense fallback={<ContextSkeleton />}>
        <ContextSections fixtureId={fixtureId} homeTeam={fixture.homeTeam} awayTeam={fixture.awayTeam} />
      </Suspense>
    </div>
  );
}

async function ContextSections({ fixtureId, homeTeam, awayTeam }: {
  fixtureId: number;
  homeTeam: { id: number; name: string; shortName: string };
  awayTeam: { id: number; name: string; shortName: string };
}) {
  // App default is Russian; only switch to EN when the user explicitly chose it.
  // В статической сборке cookies() недоступен — берём дефолт.
  const locale = STATIC_MODE ? 'ru' : (await cookies()).get('ai-score-locale')?.value === 'en' ? 'en' : 'ru';

  let raw: FixtureContext;
  try {
    raw = await api.fixtures.context(fixtureId, locale);
  } catch {
    return null;
  }

  const ctx: FixtureContext = {
    homeForm: raw.homeForm ?? [],
    awayForm: raw.awayForm ?? [],
    homeFormFlash: raw.homeFormFlash ?? [],
    awayFormFlash: raw.awayFormFlash ?? [],
    h2hWc: raw.h2hWc ?? [],
    h2hAll: raw.h2hAll ?? [],
    homeSquad: raw.homeSquad ?? [],
    awaySquad: raw.awaySquad ?? [],
    homeSquadFlash: raw.homeSquadFlash ?? [],
    awaySquadFlash: raw.awaySquadFlash ?? [],
    homeCoach: raw.homeCoach ?? null,
    awayCoach: raw.awayCoach ?? null,
    homeGroup: raw.homeGroup ?? null,
    awayGroup: raw.awayGroup ?? null,
    lineups: raw.lineups ?? null,
    stats: raw.stats ?? null,
    summary: raw.summary ?? null,
    news: raw.news ?? [],
  };

  // Fetch ESPN H2H + team form in parallel
  const [espnH2h, espnHomeForm, espnAwayForm] = await Promise.all([
    getEspnH2H(homeTeam.name, awayTeam.name).catch(() => []),
    getEspnTeamForm(homeTeam.name).catch(() => []),
    getEspnTeamForm(awayTeam.name).catch(() => []),
  ]);

  return (
    <ContextDisplay
      ctx={ctx}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      espnH2h={espnH2h}
      espnHomeForm={espnHomeForm}
      espnAwayForm={espnAwayForm}
    />
  );
}

// Server-side settle call for finished matches (POST, not cached).
async function settlePrediction(fixtureId: number): Promise<FixtureDetail['prediction']> {
  const base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${base}/v1/predictions/${fixtureId}/settle`, { method: 'POST', cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: FixtureDetail['prediction'] };
    return json.data ?? null;
  } catch {
    return null;
  }
}

function ContextSkeleton() {
  return (
    <div className="space-y-4">
      {[80, 48, 64, 200, 120].map((h, i) => (
        <div key={i} className="animate-pulse rounded-2xl" style={{ background: 'rgb(var(--pitch-900))', height: `${h * 4}px` }} />
      ))}
    </div>
  );
}

