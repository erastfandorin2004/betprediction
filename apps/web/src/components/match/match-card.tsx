import Link from 'next/link';
import Image from 'next/image';
import type { FixtureListItem } from '@ai-score/shared';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format';
import { LiveBadge } from './live-badge';
import { ScoreDisplay } from './score-display';
import { PredictionBadge } from './prediction-badge';
import { Badge } from '@/components/ui/badge';

interface MatchCardProps {
  fixture: FixtureListItem;
}

export function MatchCard({ fixture }: MatchCardProps) {
  const isLive = fixture.status === 'live';
  const isFinished = fixture.status === 'finished';
  const hasStarted = isLive || isFinished;

  const homeWin =
    fixture.score !== null && fixture.score.home > fixture.score.away;
  const awayWin =
    fixture.score !== null && fixture.score.away > fixture.score.home;

  return (
    <Link
      href={`/fixtures/${fixture.id}`}
      className={cn(
        'group relative block rounded-xl border p-4 transition-all duration-150',
        'hover:border-electric-700/50 hover:bg-pitch-800/80',
        isLive
          ? 'border-loss-500/25 bg-pitch-900'
          : 'border-pitch-700 bg-pitch-900',
      )}
    >
      {isLive && (
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-loss-500/[0.03]" />
      )}

      {/* Teams + Score row */}
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamLogo src={fixture.homeTeam.logo} name={fixture.homeTeam.name} />
          <span
            className={cn(
              'truncate text-sm font-semibold transition-colors',
              homeWin ? 'text-zinc-100' : isFinished ? 'text-zinc-500' : 'text-zinc-200',
            )}
          >
            {fixture.homeTeam.shortName || fixture.homeTeam.name}
          </span>
        </div>

        {/* Centre: score or kick-off time */}
        <div className="shrink-0 min-w-[60px] text-center">
          {hasStarted && fixture.score ? (
            <ScoreDisplay score={fixture.score} className="justify-center text-lg" />
          ) : (
            <span className="tabular text-sm font-medium text-zinc-400">
              {formatTime(fixture.startsAt)}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span
            className={cn(
              'truncate text-right text-sm font-semibold transition-colors',
              awayWin ? 'text-zinc-100' : isFinished ? 'text-zinc-500' : 'text-zinc-200',
            )}
          >
            {fixture.awayTeam.shortName || fixture.awayTeam.name}
          </span>
          <TeamLogo src={fixture.awayTeam.logo} name={fixture.awayTeam.name} />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLive && <LiveBadge minute={fixture.minute} />}
          {isFinished && (
            <span className="text-xs text-zinc-600">Завершён</span>
          )}
          {!hasStarted && (
            <span className="text-xs text-zinc-600">{formatTime(fixture.startsAt)}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {fixture.hasValue && <Badge variant="value">VALUE</Badge>}
          {fixture.prediction && (
            <PredictionBadge prediction={fixture.prediction} />
          )}
        </div>
      </div>
    </Link>
  );
}

function TeamLogo({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div className="h-7 w-7 shrink-0 rounded-full bg-pitch-700 flex items-center justify-center text-[10px] font-bold text-zinc-500">
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      width={28}
      height={28}
      className="h-7 w-7 shrink-0 rounded object-contain"
      unoptimized
    />
  );
}
