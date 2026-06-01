'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { FixtureListItem } from '@ai-score/shared';
import { formatTime } from '@/lib/format';
import { useLocale } from '@/components/i18n/locale-provider';
import { getTeamName } from '@/lib/team-names-ru';
import { LiveBadge } from './live-badge';
import { ScoreDisplay } from './score-display';
import { PredictionBadge } from './prediction-badge';
import { Badge } from '@/components/ui/badge';

interface MatchCardProps {
  fixture: FixtureListItem;
}

export function MatchCard({ fixture }: MatchCardProps) {
  const { t, locale } = useLocale();
  const isLive = fixture.status === 'live';
  const isFinished = fixture.status === 'finished';
  const hasStarted = isLive || isFinished;
  const homeWin = fixture.score !== null && fixture.score.home > fixture.score.away;
  const awayWin = fixture.score !== null && fixture.score.away > fixture.score.home;

  return (
    <Link
      href={`/fixtures/${fixture.id}`}
      className="group relative block overflow-hidden rounded-2xl p-4 shadow-sm transition-all duration-150 hover:scale-[1.005] hover:[box-shadow:0_0_0_1.5px_rgb(var(--accent)/0.5),0_6px_22px_rgb(var(--accent)/0.1)]"
      style={{
        background: 'rgb(var(--pitch-900))',
        border: `1px solid ${isLive ? 'rgb(239 68 68 / 0.4)' : 'rgb(var(--pitch-700))'}`,
      }}
    >
      {/* orange accent strip on the left */}
      <span
        className="absolute inset-y-0 left-0 w-1 opacity-60 transition-opacity group-hover:opacity-100"
        style={{ background: 'rgb(var(--accent))' }}
      />
      {/* Teams row */}
      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamLogo src={fixture.homeTeam.logo} name={fixture.homeTeam.name} />
          <span
            className="truncate text-sm font-semibold"
            style={{ color: isFinished && !homeWin ? 'rgb(var(--fg-muted))' : 'rgb(var(--fg-card))' }}
          >
            {getTeamName(fixture.homeTeam.name, fixture.homeTeam.shortName, locale, true)}
          </span>
        </div>

        {/* Score / Time */}
        <div className="shrink-0 min-w-[56px] text-center">
          {hasStarted && fixture.score ? (
            <ScoreDisplay score={fixture.score} className="justify-center text-base font-bold" />
          ) : (
            <span className="tabular text-sm font-bold" style={{ color: 'rgb(var(--accent))' }}>
              {formatTime(fixture.startsAt)}
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <span
            className="truncate text-right text-sm font-semibold"
            style={{ color: isFinished && !awayWin ? 'rgb(var(--fg-muted))' : 'rgb(var(--fg-card))' }}
          >
            {getTeamName(fixture.awayTeam.name, fixture.awayTeam.shortName, locale, true)}
          </span>
          <TeamLogo src={fixture.awayTeam.logo} name={fixture.awayTeam.name} />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLive && <LiveBadge minute={fixture.minute} />}
          {isFinished && (
            <span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{t.match.finished}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {fixture.hasValue && <Badge variant="value">VALUE</Badge>}
          {fixture.prediction && <PredictionBadge prediction={fixture.prediction} />}
        </div>
      </div>
    </Link>
  );
}

function TeamLogo({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div
        className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-muted))' }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image src={src} alt={name} width={28} height={28} className="h-7 w-7 shrink-0 rounded object-contain" unoptimized />
  );
}
