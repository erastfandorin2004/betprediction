'use client';

import Link from 'next/link';
import { Lock, TrendingUp, Bot, Sparkles, Cpu } from 'lucide-react';
import type { PredictionDetail, ModelForecast } from '@ai-score/shared';
import { formatPct } from '@/lib/format';
import { useLocale } from '@/components/i18n/locale-provider';
import { StarRating } from '@/components/ui/star-rating';
import { Badge } from '@/components/ui/badge';
import { MarketBars } from './market-bars';

interface PredictionCardProps {
  prediction: PredictionDetail;
}

const CARD = {
  background: 'rgb(var(--pitch-900))',
  border: '1px solid rgb(var(--pitch-700))',
} as const;

function CardHeader({ right }: { right?: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgb(var(--pitch-700))' }}>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: 'rgb(var(--accent) / 0.14)' }}>
          <Bot className="h-3.5 w-3.5" style={{ color: 'rgb(var(--accent))' }} />
        </span>
        <span className="text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{t.prediction.title}</span>
      </div>
      {right}
    </div>
  );
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const { t } = useLocale();

  if (prediction.isLocked) {
    return <LockedCard confidence={prediction.confidence} stars={prediction.stars} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl shadow-sm" style={CARD}>
      <CardHeader
        right={prediction.modelConsensus && (
          <span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
            {prediction.modelConsensus.totalModels} {t.prediction.models}
          </span>
        )}
      />

      <div className="space-y-5 px-5 py-5">
        <RecommendationBlock prediction={prediction} />
        {prediction.summary && <SummaryBlock summary={prediction.summary} />}
        <MarketBars markets={prediction.markets} />
        {prediction.modelConsensus && <ConsensusBlock consensus={prediction.modelConsensus} />}
        {prediction.valueEdge !== null && prediction.valueEdge > 0.03 && (
          <ValueBlock edge={prediction.valueEdge} impliedProb={prediction.impliedProbability} probability={prediction.probability} />
        )}
        {prediction.rationale && (
          <RationaleBlock rationale={prediction.rationale} keyFactors={prediction.keyFactors} />
        )}
        {prediction.models && prediction.models.length > 0 && (
          <ModelForecastsBlock models={prediction.models} />
        )}
      </div>

      <div className="px-5 py-2.5 text-center text-[11px]" style={{ borderTop: '1px solid rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
        {t.prediction.disclaimer}
      </div>
    </div>
  );
}

function RecommendationBlock({ prediction }: { prediction: PredictionDetail }) {
  const { t } = useLocale();
  const label = t.prediction.outcomes[prediction.recommendedOutcome] ?? prediction.recommendedOutcome;

  return (
    <div className="rounded-xl px-4 py-3.5" style={{ background: 'rgb(var(--accent) / 0.1)', border: '1px solid rgb(var(--accent) / 0.25)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--accent))' }}>{t.prediction.recommendation}</p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <p className="text-lg font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{label}</p>
        <span className="tabular text-2xl font-black" style={{ color: 'rgb(var(--accent))' }}>
          {formatPct(prediction.probability)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <StarRating stars={prediction.stars} />
        <span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
          {t.prediction.confidence}: {Math.round(prediction.confidence * 100)}%
        </span>
      </div>
    </div>
  );
}

function ConsensusBlock({ consensus }: { consensus: PredictionDetail['modelConsensus'] }) {
  const { t } = useLocale();
  if (!consensus) return null;

  const tone = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444' }[consensus.level];
  const pct = Math.round(consensus.agreement * 100);

  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'rgb(var(--pitch-800))' }}>
      <div className="flex items-center justify-between text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
        <span>{t.prediction.consensus}</span>
        <span className="font-semibold" style={{ color: tone }}>{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgb(var(--pitch-700))' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: tone }} />
      </div>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>{consensus.summary}</p>
    </div>
  );
}

function ValueBlock({ edge, impliedProb, probability }: { edge: number; impliedProb: number | null; probability: number }) {
  const { t } = useLocale();
  const edgePct = Math.round(edge * 100);
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.28)' }}>
      <TrendingUp className="h-4 w-4 shrink-0" style={{ color: '#f59e0b' }} />
      <div>
        <p className="text-xs font-bold" style={{ color: '#f59e0b' }}>VALUE +{edgePct}%</p>
        {impliedProb !== null && (
          <p className="mt-0.5 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
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
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{t.prediction.rationale}</p>
      <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--fg-secondary))' }}>{rationale}</p>
      {keyFactors?.length ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {keyFactors.map((f) => (
            <span key={f} className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-secondary))' }}>{f}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SummaryBlock({ summary }: { summary: string }) {
  const { t } = useLocale();
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgb(var(--accent) / 0.1)', border: '1px solid rgb(var(--accent) / 0.25)' }}>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--accent))' }}>
        <Sparkles className="h-3.5 w-3.5" /> {t.prediction.summaryLabel}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--fg-card))' }}>{summary}</p>
    </div>
  );
}

function ModelForecastsBlock({ models }: { models: ModelForecast[] }) {
  const { t } = useLocale();
  const p = t.prediction;
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
        <Cpu className="h-3.5 w-3.5" /> {p.modelForecasts}
      </p>
      <div className="space-y-1.5">
        {models.map((m, i) => (
          <div key={i} className="rounded-lg px-3 py-2" style={{ background: 'rgb(var(--pitch-800))' }}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{m.modelId}</span>
              {m.error ? (
                <span className="text-[11px]" style={{ color: '#ef4444' }}>· {p.noResponse}</span>
              ) : (
                <>
                  {m.probability !== null && (
                    <span className="tabular text-[11px] font-medium" style={{ color: 'rgb(var(--fg-secondary))' }}>
                      {Math.round(m.probability * 100)}%
                    </span>
                  )}
                  {m.ownOutcomeLabel && (
                    <span className="text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{p.ownPick}: {m.ownOutcomeLabel}</span>
                  )}
                  {m.agreed && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'rgb(var(--accent) / 0.16)', color: 'rgb(var(--accent))' }}>
                      ✓ {p.agrees}
                    </span>
                  )}
                </>
              )}
            </div>
            {m.rationale && (
              <p className="mt-1 text-[11px] leading-snug" style={{ color: 'rgb(var(--fg-muted))' }}>{m.rationale}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LockedCard({ confidence, stars }: { confidence: number; stars: number }) {
  const { t } = useLocale();
  return (
    <div className="overflow-hidden rounded-2xl shadow-sm" style={CARD}>
      <CardHeader right={<Badge variant="value">Pro</Badge>} />
      <div className="px-5 py-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgb(var(--pitch-800))' }}>
          <Lock className="h-5 w-5" style={{ color: 'rgb(var(--fg-muted))' }} />
        </div>
        <p className="mt-3 text-sm font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{t.prediction.locked}</p>
        <div className="mt-1.5 flex justify-center"><StarRating stars={stars as 1 | 2 | 3 | 4 | 5} /></div>
        <p className="mt-1 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{t.prediction.confidence} {Math.round(confidence * 100)}%</p>
        <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>{t.prediction.lockedDesc}</p>
        <Link
          href="/register"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full px-6 py-2 text-sm font-semibold transition-transform hover:scale-[1.03]"
          style={{ background: 'linear-gradient(90deg, rgb(var(--accent)), #c46a2c)', color: '#04140a' }}
        >
          <Sparkles className="h-4 w-4" />
          {t.prediction.tryFree}
        </Link>
      </div>
    </div>
  );
}
