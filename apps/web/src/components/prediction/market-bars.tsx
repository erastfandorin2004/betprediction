import type { PredictionMarket } from '@ai-score/shared';
import { cn } from '@/lib/utils';
import { MARKET_LABELS } from '@ai-score/shared';

type MarketKey = keyof typeof MARKET_LABELS;

interface MarketBarsProps {
  markets: PredictionMarket[];
}

export function MarketBars({ markets }: MarketBarsProps) {
  return (
    <div className="space-y-5">
      {markets.map((market) => (
        <MarketSection key={market.market} market={market} />
      ))}
    </div>
  );
}

function MarketSection({ market }: { market: PredictionMarket }) {
  const label = MARKET_LABELS[market.market as MarketKey] ?? market.market;
  const is1x2 = market.market === '1X2';

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-600">{label}</p>
      <div className={cn('space-y-1.5', !is1x2 && 'flex gap-4 space-y-0')}>
        {market.outcomes.map((o) =>
          is1x2 ? (
            <FullBar key={o.outcome} label={o.label} probability={o.probability} isRec={o.isRecommended} />
          ) : (
            <CompactBadge key={o.outcome} label={o.label} probability={o.probability} isRec={o.isRecommended} />
          ),
        )}
      </div>
    </div>
  );
}

function FullBar({
  label,
  probability,
  isRec,
}: {
  label: string;
  probability: number;
  isRec: boolean;
}) {
  const pct = Math.round(probability * 100);
  return (
    <div className="flex items-center gap-3">
      <span className={cn('w-20 shrink-0 text-right text-sm', isRec ? 'font-semibold text-zinc-100' : 'text-zinc-500')}>
        {label}
      </span>
      <div className="flex-1 overflow-hidden rounded-full bg-pitch-800 h-2">
        <div
          className={cn('h-full rounded-full transition-all duration-500', isRec ? 'bg-electric-500' : 'bg-zinc-700')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('tabular w-9 text-right text-sm', isRec ? 'font-bold text-electric-400' : 'text-zinc-600')}>
        {pct}%
      </span>
    </div>
  );
}

function CompactBadge({
  label,
  probability,
  isRec,
}: {
  label: string;
  probability: number;
  isRec: boolean;
}) {
  const pct = Math.round(probability * 100);
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
        isRec ? 'bg-electric-500/15 text-electric-300' : 'bg-pitch-800 text-zinc-500',
      )}
    >
      <span className="font-medium">{label}</span>
      <span className={cn('tabular ml-auto font-semibold', isRec ? 'text-electric-400' : 'text-zinc-600')}>
        {pct}%
      </span>
    </div>
  );
}
