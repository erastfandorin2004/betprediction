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
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{label}</p>
      <div className={cn('space-y-1.5', !is1x2 && 'flex gap-3 space-y-0')}>
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

function FullBar({ label, probability, isRec }: { label: string; probability: number; isRec: boolean }) {
  const pct = Math.round(probability * 100);
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-20 shrink-0 truncate text-right text-sm"
        style={{ color: isRec ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-muted))', fontWeight: isRec ? 600 : 400 }}
      >
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'rgb(var(--pitch-800))' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: isRec ? 'rgb(var(--accent))' : 'rgb(var(--pitch-600))' }}
        />
      </div>
      <span
        className="tabular w-9 text-right text-sm"
        style={{ color: isRec ? 'rgb(var(--accent))' : 'rgb(var(--fg-muted))', fontWeight: isRec ? 700 : 400 }}
      >
        {pct}%
      </span>
    </div>
  );
}

function CompactBadge({ label, probability, isRec }: { label: string; probability: number; isRec: boolean }) {
  const pct = Math.round(probability * 100);
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
      style={isRec
        ? { background: 'rgb(var(--accent) / 0.14)', color: 'rgb(var(--accent))', border: '1px solid rgb(var(--accent) / 0.25)' }
        : { background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-muted))' }}
    >
      <span className="font-medium">{label}</span>
      <span className="tabular ml-auto font-bold" style={{ color: isRec ? 'rgb(var(--accent))' : 'rgb(var(--fg-muted))' }}>
        {pct}%
      </span>
    </div>
  );
}
