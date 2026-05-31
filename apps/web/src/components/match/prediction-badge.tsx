import { Lock } from 'lucide-react';
import type { PredictionBadge as PredictionBadgeType } from '@ai-score/shared';
import { StarRating } from '@/components/ui/star-rating';
import { formatPct } from '@/lib/format';

export function PredictionBadge({ prediction }: { prediction: PredictionBadgeType }) {
  if (prediction.isLocked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-600">
        <Lock className="h-3 w-3" />
        Pro
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-electric-500/15 px-2.5 py-0.5 text-xs font-semibold text-electric-400">
      {prediction.recommendedOutcome} · {formatPct(prediction.probability)}
      <StarRating stars={prediction.stars} />
    </span>
  );
}
