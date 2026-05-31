import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { formatTime, formatDateLabel } from '@/lib/format';
import { LiveBadge } from '@/components/match/live-badge';
import { ScoreDisplay } from '@/components/match/score-display';
import { Badge } from '@/components/ui/badge';
import { PredictionCard } from '@/components/prediction/prediction-card';
import { cn } from '@/lib/utils';
import type { FixtureDetail, MatchEvent } from '@ai-score/shared';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FixturePage({ params }: Props) {
  const { id } = await params;
  const fixtureId = parseInt(id, 10);

  if (isNaN(fixtureId)) notFound();

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="h-4 w-4" />
        Матчи
      </Link>

      {/* Match header */}
      <div className="card-surface overflow-hidden">
        {/* League bar */}
        <div className="flex items-center gap-2 border-b border-pitch-800 px-5 py-2.5">
          {fixture.league.logo && (
            <img src={fixture.league.logo} alt="" className="h-4 w-4 object-contain" />
          )}
          <span className="text-xs text-zinc-500">{fixture.league.name}</span>
          {fixture.round && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-xs text-zinc-600">{fixture.round}</span>
            </>
          )}
        </div>

        {/* Teams */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-4">
            <TeamBlock
              name={fixture.homeTeam.name}
              shortName={fixture.homeTeam.shortName}
              logo={fixture.homeTeam.logo}
              bold={isFinished && fixture.score !== null && fixture.score.home > fixture.score.away}
            />

            <div className="shrink-0 text-center">
              {hasStarted && fixture.score ? (
                <ScoreDisplay score={fixture.score} className="justify-center text-3xl" />
              ) : (
                <div>
                  <div className="tabular text-2xl font-bold text-zinc-300">
                    {formatTime(fixture.startsAt)}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-600">
                    {formatDateLabel(fixture.startsAt)}
                  </div>
                </div>
              )}
              {isLive && (
                <div className="mt-2 flex justify-center">
                  <LiveBadge minute={fixture.minute} />
                </div>
              )}
              {isFinished && (
                <Badge variant="muted" className="mt-2">Завершён</Badge>
              )}
            </div>

            <TeamBlock
              name={fixture.awayTeam.name}
              shortName={fixture.awayTeam.shortName}
              logo={fixture.awayTeam.logo}
              align="right"
              bold={isFinished && fixture.score !== null && fixture.score.away > fixture.score.home}
            />
          </div>

          {/* Half-time score */}
          {fixture.score?.halfTime && (
            <p className="mt-3 text-center text-xs text-zinc-600">
              Перерыв: {fixture.score.halfTime.home} : {fixture.score.halfTime.away}
            </p>
          )}
        </div>

        {/* Venue + time meta */}
        {(fixture.venue || true) && (
          <div className="flex flex-wrap items-center gap-4 border-t border-pitch-800 px-5 py-3 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateLabel(fixture.startsAt)}, {formatTime(fixture.startsAt)} (МСК)
            </span>
            {fixture.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {fixture.venue.name}
                {fixture.venue.city ? `, ${fixture.venue.city}` : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* AI Prediction */}
      {fixture.prediction ? (
        <PredictionCard prediction={fixture.prediction} />
      ) : (
        <div className="card-surface p-5 text-center">
          <p className="text-sm font-semibold text-zinc-300">🤖 AI-прогноз</p>
          <p className="mt-2 text-xs text-zinc-500">
            {hasStarted
              ? 'Прогноз фиксируется только до начала матча'
              : 'Прогноз готовится — воркер генерирует за 1–2 часа до матча'}
          </p>
        </div>
      )}

      {/* Match events */}
      {fixture.events.length > 0 && (
        <section className="card-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-300">События матча</h3>
          <EventTimeline events={fixture.events} />
        </section>
      )}

      {/* Placeholder sections */}
      {!hasStarted && (
        <div className="grid gap-3 sm:grid-cols-2">
          {['Статистика', 'Форма', 'H2H', 'Составы'].map((label) => (
            <div key={label} className="card-surface p-5">
              <p className="text-sm font-semibold text-zinc-500">{label}</p>
              <p className="mt-2 text-xs text-zinc-700">
                Появятся в следующих шагах
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamBlock({
  name,
  shortName,
  logo,
  align = 'left',
  bold,
}: {
  name: string;
  shortName: string;
  logo: string | null;
  align?: 'left' | 'right';
  bold?: boolean;
}) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col items-center gap-2', align === 'right' && '')}>
      {logo ? (
        <Image src={logo} alt={name} width={52} height={52} className="h-13 w-13 object-contain" unoptimized />
      ) : (
        <div className="flex h-13 w-13 items-center justify-center rounded-full bg-pitch-700 text-lg font-bold text-zinc-500">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className={cn('text-center text-sm font-semibold', bold ? 'text-zinc-100' : 'text-zinc-400')}>
        {shortName || name}
      </span>
    </div>
  );
}

const EVENT_ICON: Record<string, string> = {
  goal: '⚽',
  own_goal: '⚽',
  penalty: '⚽',
  missed_penalty: '❌',
  yellow_card: '🟨',
  red_card: '🟥',
  yellow_red_card: '🟨🟥',
  substitution: '🔄',
};

function EventTimeline({ events }: { events: MatchEvent[] }) {
  return (
    <div className="space-y-2">
      {events.map((e) => (
        <div key={e.id} className="flex items-center gap-3 text-sm">
          <span className="tabular w-10 shrink-0 text-right text-xs text-zinc-500">
            {e.minute}′
          </span>
          <span>{EVENT_ICON[e.type] ?? '•'}</span>
          <span className="text-zinc-300">{e.player?.name ?? '—'}</span>
          {e.type === 'substitution' && e.assist && (
            <span className="text-zinc-600">↓ {e.assist.name}</span>
          )}
          <span className={cn('ml-auto text-xs', e.team === 'home' ? 'text-electric-500' : 'text-zinc-600')}>
            {e.team === 'home' ? 'Хозяева' : 'Гости'}
          </span>
        </div>
      ))}
    </div>
  );
}
