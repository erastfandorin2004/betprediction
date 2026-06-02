'use client';

import Link from 'next/link';
import { Lock, TrendingUp, Bot } from 'lucide-react';
import type { PredictionDetail } from '@ai-score/shared';
import { cn } from '@/lib/utils';
import { formatPct } from '@/lib/format';
import { useLocale } from '@/components/i18n/locale-provider';
import { StarRating } from '@/components/ui/star-rating';
import { Badge } from '@/components/ui/badge';
import { MarketBars } from './market-bars';

interface PredictionCardProps {
  prediction: PredictionDetail;
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const { t } = useLocale();

  if (prediction.isLocked) {
    return <LockedCard confidence={prediction.confidence} stars={prediction.stars} />;
  }

  return (
    <div className="card-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-pitch-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" style={{ color: 'rgb(var(--accent))' }} />
          <span className="text-sm font-semibold text-zinc-300">{t.prediction.title}</span>
        </div>
        {prediction.modelConsensus && (
          <span className="text-xs text-zinc-600">
            {prediction.modelConsensus.totalModels} {t.prediction.models}
          </span>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">
        <RecommendationBlock prediction={prediction} />
        <MarketBars markets={prediction.markets} />
        {prediction.modelConsensus && <ConsensusBlock consensus={prediction.modelConsensus} />}
        {prediction.valueEdge !== null && prediction.valueEdge > 0.03 && (
          <ValueBlock edge={prediction.valueEdge} impliedProb={prediction.impliedProbability} probability={prediction.probability} />
        )}
        {prediction.rationale && (
          <RationaleBlock rationale={prediction.rationale} keyFactors={prediction.keyFactors} />
        )}
      </div>

      <div className="border-t border-pitch-800 px-5 py-2.5 text-center text-xs text-zinc-700">
        {t.prediction.disclaimer}
      </div>
    </div>
  );
}

function RecommendationBlock({ prediction }: { prediction: PredictionDetail }) {
  const { t } = useLocale();
  const label = t.prediction.outcomes[prediction.recommendedOutcome] ?? prediction.recommendedOutcome;

  return (
    <div className="rounded-xl bg-electric-500/10 border border-electric-700/30 px-4 py-3.5">
      <p className="text-xs font-medium uppercase tracking-wide text-electric-600">{t.prediction.recommendation}</p>
      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-lg font-bold text-electric-300">{label}</p>
        <span className="tabular text-2xl font-black text-electric-400">
          {formatPct(prediction.probability)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <StarRating stars={prediction.stars} />
        <span className="text-xs text-zinc-600">
          {t.prediction.confidence}: {Math.round(prediction.confidence * 100)}%
        </span>
      </div>
    </div>
  );
}

function ConsensusBlock({ consensus }: { consensus: PredictionDetail['modelConsensus'] }) {
  const { t } = useLocale();
  if (!consensus) return null;

  const meterColor = { high: 'bg-goal-500', medium: 'bg-value-500', low: 'bg-loss-500' }[consensus.level];
  const pct = Math.round(consensus.agreement * 100);

  return (
    <div className="rounded-lg bg-pitch-800 px-4 py-3">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{t.prediction.consensus}</span>
        <span className={cn('font-semibold', { high: 'text-goal-400', medium: 'text-value-400', low: 'text-loss-400' }[consensus.level])}>{pct}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-pitch-700">
        <div className={cn('h-full rounded-full transition-all', meterColor)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">{consensus.summary}</p>
    </div>
  );
}

function ValueBlock({ edge, impliedProb, probability }: { edge: number; impliedProb: number | null; probability: number }) {
  const { t } = useLocale();
  const edgePct = Math.round(edge * 100);
  return (
    <div className="flex items-center gap-3 rounded-lg bg-value-500/10 border border-value-700/30 px-4 py-3">
      <TrendingUp className="h-4 w-4 shrink-0 text-value-400" />
      <div>
        <p className="text-xs font-semibold text-value-400">VALUE +{edgePct}%</p>
        {impliedProb !== null && (
          <p className="mt-0.5 text-xs text-zinc-600">
            AI: {formatPct(probability)} · {t.prediction.market}: {formatPct(impliedProb)} → {t.prediction.edge} {edgePct}%
          </p>
        )}
      </div>
    </div>
  );
}

function RationaleBlock({ rationale, keyFactors }: { rationale: string; keyFactors: string[] | null }) {
  const { t } = useLocale();
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">{t.prediction.rationale}</p>
      <p className="text-sm leading-relaxed text-zinc-400">{rationale}</p>
      {keyFactors?.length ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {keyFactors.map((f) => (
            <span key={f} className="rounded-full bg-pitch-800 px-2.5 py-0.5 text-xs text-zinc-500">{f}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LockedCard({ confidence, stars }: { confidence: number; stars: number }) {
  const { t } = useLocale();
  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-pitch-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4" style={{ color: 'rgb(var(--accent))' }} />
          <span className="text-sm font-semibold text-zinc-300">{t.prediction.title}</span>
        </div>
        <Badge variant="value">Pro</Badge>
      </div>
      <div className="px-5 py-6 text-center">
        <Lock className="mx-auto h-8 w-8 text-zinc-700" />
        <p className="mt-3 text-sm font-medium text-zinc-400">{t.prediction.locked}</p>
        <StarRating stars={stars as 1 | 2 | 3 | 4 | 5} />
        <p className="mt-1 text-xs text-zinc-600">{t.prediction.confidence} {Math.round(confidence * 100)}%</p>
        <p className="mt-3 text-xs text-zinc-600">{t.prediction.lockedDesc}</p>
        <Link href="/register" className="mt-4 inline-block rounded-xl bg-electric-600 px-6 py-2 text-sm font-semibold text-white hover:bg-electric-500">
          {t.prediction.tryFree}
        </Link>
      </div>
    </div>
  );
}
