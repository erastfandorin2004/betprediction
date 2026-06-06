'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  Lock, TrendingUp, Bot, Sparkles, Cpu, CheckCircle2, XCircle, MinusCircle,
  ClipboardCheck, Target, Star, Lightbulb, ListChecks, Trophy, Percent, type LucideIcon,
} from 'lucide-react';
import type { PredictionDetail, ModelForecast, PredictionSettlement, MarketCheck, PredictionMarket } from '@ai-score/shared';
import { MARKET_LABELS } from '@ai-score/shared';
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

const POSITIVE = '#22c55e';
const NEGATIVE = '#ef4444';
const WARN = '#f59e0b';

// Small section label: clear icon + uppercase title (+ optional hint).
function SectionLabel({ icon: Icon, children, hint }: { icon: LucideIcon; children: React.ReactNode; hint?: string }) {
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-secondary))' }}>
      <Icon className="h-4 w-4" style={{ color: 'rgb(var(--accent))' }} />
      {children}
      {hint && <span className="font-medium normal-case tracking-normal" style={{ color: 'rgb(var(--fg-muted))' }}>· {hint}</span>}
    </p>
  );
}

function CardHeader({ right }: { right?: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-between px-5 py-3.5 sm:px-6" style={{ borderBottom: '1px solid rgb(var(--pitch-700))' }}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgb(var(--accent) / 0.15)', boxShadow: '0 0 14px rgb(var(--accent) / 0.25)' }}>
          <Bot className="h-5 w-5" style={{ color: 'rgb(var(--accent))' }} />
        </span>
        <span className="text-base font-bold" style={{ color: 'rgb(var(--fg-card))' }}>{t.prediction.title}</span>
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
    <div className="overflow-hidden rounded-2xl shadow-lg" style={CARD}>
      <CardHeader
        right={prediction.modelConsensus && (
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-secondary))' }}>
            <Cpu className="h-3.5 w-3.5" style={{ color: 'rgb(var(--accent))' }} />
            {prediction.modelConsensus.totalModels} {t.prediction.models}
          </span>
        )}
      />

      <div className="space-y-6 px-5 py-6 sm:px-6">
        {prediction.settlement && <SettlementBlock s={prediction.settlement} />}
        <RecommendationBlock prediction={prediction} />
        <ProposedBetsBlock
          markets={prediction.markets}
          recMarket={prediction.recommendedMarket}
          recOutcome={prediction.recommendedOutcome}
        />
        {prediction.valueEdge !== null && prediction.valueEdge > 0.03 && (
          <ValueBlock edge={prediction.valueEdge} impliedProb={prediction.impliedProbability} probability={prediction.probability} />
        )}
        <MarketBars markets={prediction.markets} />

        {/* Порядок блоков по моделям: общее мнение → прогнозы моделей → согласие → обоснование */}
        {prediction.summary && <SummaryBlock summary={prediction.summary} />}
        {prediction.models && prediction.models.length > 0 && (
          <ModelForecastsBlock models={prediction.models} />
        )}
        {prediction.modelConsensus && <ConsensusBlock consensus={prediction.modelConsensus} />}
        {prediction.rationale && (
          <RationaleBlock rationale={prediction.rationale} keyFactors={prediction.keyFactors} />
        )}
      </div>

      <div className="px-5 py-3 text-center text-xs sm:px-6" style={{ borderTop: '1px solid rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
        {t.prediction.disclaimer}
      </div>
    </div>
  );
}

// ── HERO: main AI prediction (what to bet on) ───────────────────────────────
function RecommendationBlock({ prediction }: { prediction: PredictionDetail }) {
  const { t } = useLocale();
  const label = t.prediction.outcomes[prediction.recommendedOutcome] ?? prediction.recommendedOutcome;
  const conf = Math.round(prediction.confidence * 100);

  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: 'linear-gradient(135deg, rgb(var(--accent) / 0.16), rgb(var(--accent) / 0.05))',
        border: '1px solid rgb(var(--accent) / 0.35)',
        boxShadow: '0 0 24px rgb(var(--accent) / 0.12)',
      }}
    >
      <SectionLabel icon={Target}>{t.prediction.recommendation}</SectionLabel>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-2xl font-extrabold leading-tight sm:text-3xl" style={{ color: 'rgb(var(--fg-primary))' }}>{label}</p>
        <div className="shrink-0 text-right">
          <p className="tabular text-4xl font-black leading-none sm:text-5xl" style={{ color: 'rgb(var(--accent))' }}>
            {formatPct(prediction.probability)}
          </p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
            <Percent className="h-3 w-3" /> {t.prediction.confidence === 'Уверенность' ? 'вероятность' : 'probability'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StarRating stars={prediction.stars} />
        <div className="flex flex-1 items-center gap-2" style={{ minWidth: 160 }}>
          <span className="text-xs font-medium" style={{ color: 'rgb(var(--fg-muted))' }}>{t.prediction.confidence}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'rgb(var(--pitch-800))' }}>
            <div className="h-full rounded-full" style={{ width: `${conf}%`, background: 'rgb(var(--accent))' }} />
          </div>
          <span className="tabular text-sm font-bold" style={{ color: 'rgb(var(--fg-secondary))' }}>{conf}%</span>
        </div>
      </div>
    </div>
  );
}

// ── Key conclusion (combined opinion of all models) ─────────────────────────
function SummaryBlock({ summary }: { summary: string }) {
  const { t } = useLocale();
  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}>
      <SectionLabel icon={Sparkles}>{t.prediction.summaryLabel}</SectionLabel>
      <p className="mt-2.5 text-[15px] leading-relaxed" style={{ color: 'rgb(var(--fg-card))' }}>{summary}</p>
    </div>
  );
}

// ── Concrete proposed bets (top pick per market) ────────────────────────────
function ProposedBetsBlock({
  markets, recMarket, recOutcome,
}: {
  markets: PredictionMarket[]; recMarket: string; recOutcome: string;
}) {
  const { t } = useLocale();
  const p = t.prediction;
  const bets = markets
    .map((m) => {
      if (!m.outcomes.length) return null;
      const top = m.outcomes.reduce((b, o) => (o.probability > b.probability ? o : b));
      return { market: m.market, label: (MARKET_LABELS as Record<string, string>)[m.market] ?? m.market, pick: top };
    })
    .filter(Boolean) as { market: string; label: string; pick: { label: string; outcome: string; probability: number } }[];
  if (!bets.length) return null;

  return (
    <div className="space-y-3">
      <SectionLabel icon={ListChecks} hint={p.proposedHint}>{p.proposedTitle}</SectionLabel>
      <div className="space-y-2">
        {bets.map((b, i) => {
          const isMain = b.market === recMarket && b.pick.outcome === recOutcome;
          const pct = Math.round(b.pick.probability * 100);
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
              style={{
                background: isMain ? 'rgb(var(--accent) / 0.12)' : 'rgb(var(--pitch-800))',
                border: isMain ? '1px solid rgb(var(--accent) / 0.4)' : '1px solid rgb(var(--pitch-700))',
              }}
            >
              <div className="min-w-0">
                <span className="text-xs font-medium" style={{ color: 'rgb(var(--fg-muted))' }}>{b.label}</span>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-base font-bold" style={{ color: 'rgb(var(--fg-card))' }}>
                  {b.pick.label}
                  {isMain && (
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'rgb(var(--accent) / 0.2)', color: 'rgb(var(--accent))' }}>
                      <Star className="h-3 w-3 fill-current" /> {p.mainBet}
                    </span>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="tabular text-lg font-extrabold" style={{ color: isMain ? 'rgb(var(--accent))' : 'rgb(var(--fg-secondary))' }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Value vs bookmaker line ─────────────────────────────────────────────────
function ValueBlock({ edge, impliedProb, probability }: { edge: number; impliedProb: number | null; probability: number }) {
  const { t } = useLocale();
  const edgePct = Math.round(edge * 100);
  return (
    <div className="flex items-center gap-3.5 rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' }}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(245,158,11,0.18)' }}>
        <TrendingUp className="h-5 w-5" style={{ color: WARN }} />
      </span>
      <div>
        <p className="text-base font-extrabold uppercase" style={{ color: WARN }}>{t.prediction.valueLabel} +{edgePct}%</p>
        {impliedProb !== null && (
          <p className="mt-0.5 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
            AI {formatPct(probability)} · {t.prediction.market} {formatPct(impliedProb)} → {t.prediction.edge} {edgePct}%
          </p>
        )}
      </div>
    </div>
  );
}

// ── Explanation: key factors (scannable) + rationale paragraphs ─────────────
function RationaleBlock({ rationale, keyFactors }: { rationale: string; keyFactors: string[] | null }) {
  const { t } = useLocale();
  const paragraphs = rationale.split(/\n+|(?<=[.!?])\s+(?=[А-ЯA-Z])/).map((s) => s.trim()).filter((s) => s.length > 1);

  return (
    <div className="space-y-3">
      <SectionLabel icon={Lightbulb}>{t.prediction.rationale}</SectionLabel>

      {keyFactors?.length ? (
        <ul className="space-y-1.5">
          {keyFactors.map((f) => (
            <li key={f} className="flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm" style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-secondary))' }}>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'rgb(var(--accent))' }} />
              <span className="leading-snug">{f}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-[15px] leading-relaxed" style={{ color: 'rgb(var(--fg-secondary))' }}>{para}</p>
        ))}
      </div>
    </div>
  );
}

// ── Model consensus ─────────────────────────────────────────────────────────
function ConsensusBlock({ consensus }: { consensus: PredictionDetail['modelConsensus'] }) {
  const { t } = useLocale();
  if (!consensus) return null;
  const tone = { high: POSITIVE, medium: WARN, low: NEGATIVE }[consensus.level];
  const pct = Math.round(consensus.agreement * 100);

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}>
      <div className="flex items-center justify-between text-sm" style={{ color: 'rgb(var(--fg-secondary))' }}>
        <span className="font-semibold">{t.prediction.consensus}</span>
        <span className="tabular text-base font-bold" style={{ color: tone }}>{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'rgb(var(--pitch-900))' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: tone }} />
      </div>
      <p className="mt-2.5 text-sm leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>{consensus.summary}</p>
    </div>
  );
}

// ── Per-model forecasts ─────────────────────────────────────────────────────
function ModelForecastsBlock({ models }: { models: ModelForecast[] }) {
  const { t } = useLocale();
  const p = t.prediction;
  return (
    <div className="space-y-3">
      <SectionLabel icon={Cpu}>{p.modelForecasts}</SectionLabel>
      <div className="space-y-2">
        {models.map((m, i) => (
          <div key={i} className="rounded-xl px-3.5 py-2.5" style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-sm font-bold" style={{ color: 'rgb(var(--fg-card))' }}>{m.modelId}</span>
              {m.error ? (
                <span className="text-xs" style={{ color: NEGATIVE }}>· {p.noResponse}</span>
              ) : (
                <>
                  {m.probability !== null && (
                    <span className="tabular text-xs font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{Math.round(m.probability * 100)}%</span>
                  )}
                  {m.ownOutcomeLabel && (
                    <span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{p.ownPick}: {m.ownOutcomeLabel}</span>
                  )}
                  {m.agreed && (
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgb(var(--accent) / 0.18)', color: 'rgb(var(--accent))' }}>
                      <CheckCircle2 className="h-3 w-3" /> {p.agrees}
                    </span>
                  )}
                </>
              )}
            </div>
            {m.rationale && <p className="mt-1.5 text-xs leading-snug" style={{ color: 'rgb(var(--fg-muted))' }}>{m.rationale}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── POST-MATCH: prediction check / verdict ──────────────────────────────────
const ST_COLOR: Record<string, string> = { won: POSITIVE, lost: NEGATIVE, push: WARN, unknown: 'rgb(var(--fg-muted))' };
const ST_ICON: Record<string, ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  won: CheckCircle2, lost: XCircle, push: MinusCircle, unknown: MinusCircle,
};

function SettlementBlock({ s }: { s: PredictionSettlement }) {
  const { t } = useLocale();
  const c = t.prediction.check;
  const headColor = s.overall === 'won' ? POSITIVE : s.overall === 'partial' ? WARN : NEGATIVE;
  const headLabel = s.overall === 'won' ? c.won : s.overall === 'partial' ? c.partial : c.lost;
  const HeadIcon = s.overall === 'won' ? CheckCircle2 : s.overall === 'partial' ? MinusCircle : XCircle;

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: 'rgb(var(--pitch-800))', border: `1.5px solid ${headColor}66`, boxShadow: `0 0 22px ${headColor}1f` }}>
      {/* Header: title */}
      <div className="flex items-center gap-2 px-4 py-3 sm:px-5" style={{ borderBottom: '1px solid rgb(var(--pitch-700))' }}>
        <ClipboardCheck className="h-5 w-5" style={{ color: headColor }} />
        <span className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-card))' }}>{c.title}</span>
      </div>

      {/* Hero: final score + verdict */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
            <Trophy className="h-3.5 w-3.5" /> {c.final}
          </p>
          <p className="tabular mt-1 text-3xl font-black leading-none sm:text-4xl" style={{ color: 'rgb(var(--fg-primary))' }}>
            {s.finalScore.home}:{s.finalScore.away}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-extrabold" style={{ background: `${headColor}26`, color: headColor, border: `1px solid ${headColor}66` }}>
            <HeadIcon className="h-5 w-5" /> {headLabel}
          </span>
          <p className="mt-1.5 text-xs font-medium" style={{ color: 'rgb(var(--fg-muted))' }}>{c.summary(s.wonCount, s.total)}</p>
        </div>
      </div>

      {/* Per-market checks */}
      <div className="space-y-2 px-4 pb-4 sm:px-5">
        {s.checks.map((chk, i) => <CheckRow key={i} chk={chk} stLabels={c.st} forecast={c.forecast} fact={c.fact} />)}
      </div>

      <div className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] sm:px-5" style={{ borderTop: '1px solid rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
        <Lock className="h-3 w-3" /> {c.locked}
      </div>
    </div>
  );
}

function CheckRow({ chk, stLabels, forecast, fact }: { chk: MarketCheck; stLabels: Record<string, string>; forecast: string; fact: string }) {
  const color = ST_COLOR[chk.status] ?? 'rgb(var(--fg-muted))';
  const Icon = ST_ICON[chk.status] ?? MinusCircle;
  return (
    <div className="flex gap-3 rounded-xl py-2.5 pl-3 pr-3.5" style={{ background: 'rgb(var(--pitch-900))', borderLeft: `3px solid ${color}` }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold" style={{ color: 'rgb(var(--fg-card))' }}>{chk.marketLabel}</span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold" style={{ color }}>
            <Icon className="h-4 w-4" /> {stLabels[chk.status] ?? chk.status}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          <span style={{ color: 'rgb(var(--fg-muted))' }}>{forecast}: <span className="font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{chk.predictedLabel}</span></span>
          <span style={{ color: 'rgb(var(--fg-muted))' }}>{fact}: <span className="font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{chk.actual}</span></span>
        </div>
        {chk.explanation && <p className="mt-1 text-xs leading-snug" style={{ color: 'rgb(var(--fg-muted))' }}>{chk.explanation}</p>}
      </div>
    </div>
  );
}

function LockedCard({ confidence, stars }: { confidence: number; stars: number }) {
  const { t } = useLocale();
  return (
    <div className="overflow-hidden rounded-2xl shadow-lg" style={CARD}>
      <CardHeader right={<Badge variant="value">Pro</Badge>} />
      <div className="px-5 py-8 text-center sm:px-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgb(var(--pitch-800))' }}>
          <Lock className="h-6 w-6" style={{ color: 'rgb(var(--fg-muted))' }} />
        </div>
        <p className="mt-4 text-base font-bold" style={{ color: 'rgb(var(--fg-secondary))' }}>{t.prediction.locked}</p>
        <div className="mt-2 flex justify-center"><StarRating stars={stars as 1 | 2 | 3 | 4 | 5} /></div>
        <p className="mt-1.5 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{t.prediction.confidence} {Math.round(confidence * 100)}%</p>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>{t.prediction.lockedDesc}</p>
        <Link
          href="/register"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full px-7 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03]"
          style={{ background: 'linear-gradient(90deg, rgb(var(--accent)), #c46a2c)', color: '#04140a' }}
        >
          <Sparkles className="h-4 w-4" />
          {t.prediction.tryFree}
        </Link>
      </div>
    </div>
  );
}
