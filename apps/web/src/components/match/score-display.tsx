import type { Score } from '@ai-score/shared';
import { cn } from '@/lib/utils';

interface ScoreDisplayProps {
  score: Score;
  className?: string;
}

export function ScoreDisplay({ score, className }: ScoreDisplayProps) {
  return (
    <div className={cn('tabular flex items-center gap-1.5 text-xl font-bold text-zinc-100', className)}>
      <span>{score.home}</span>
      <span className="text-zinc-600">:</span>
      <span>{score.away}</span>
    </div>
  );
}
