'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  ShieldCheck,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Sparkles,
  Cpu,
  ChevronDown,
  History,
} from 'lucide-react';
import { useLocale } from '@/components/i18n/locale-provider';
import { StarRating } from '@/components/ui/star-rating';
import type { TrackRecordStats, BacktestSummary, BacktestPick, BacktestModelView, PredictionHistoryItem } from '@ai-score/shared';

const CARD = {
  background: 'rgb(var(--pitch-900))',
  border: '1px solid rgb(var(--pitch-700))',
} as const;

const POSITIVE = '#22c55e';
const NEGATIVE = '#ef4444';

const MARKET_LABEL: Record<string, string> = {
  '1X2': '1X2',
  DC: 'Двойной шанс',
  BTTS: 'Обе забьют',
  O_U_1_5: 'Тотал 1.5',
  O_U_2_5: 'Тотал 2.5',
  O_U_3_5: 'Тотал 3.5',
  HOME_TOTAL: 'Инд. тотал хозяев',
  AWAY_TOTAL: 'Инд. тотал гостей',
  CORNERS_OU: 'Угловые',
  CARDS_OU: 'Карточки',
};

export function TrackRecordContent({
  stats,
  backtest,
  history = [],
}: {
  stats: TrackRecordStats | null;
  backtest: BacktestSummary | null;
  history?: PredictionHistoryItem[];
}) {
  const { t } = useLocale();
  const tr = t.trackRecord;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'rgb(var(--accent) / 0.12)', border: '1px solid rgb(var(--accent) / 0.25)' }}
        >
          <BarChart3 className="h-5 w-5" style={{ color: 'rgb(var(--accent))' }} />
        </span>
        <div>
          <h1 className="text-2xl font-bold leading-none tracking-tight" style={{ color: 'rgb(var(--fg-primary))' }}>{tr.title}</h1>
          <p className="mt-1.5 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{tr.subtitle}</p>
        </div>
      </div>

      <HistorySection history={history} />

      <div className="mt-6">
        <BacktestSection backtest={backtest} />
      </div>

      {!stats || stats.overall.total === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl px-6 py-12 text-center" style={CARD}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgb(var(--pitch-800))' }}>
            <BarChart3 className="h-7 w-7" style={{ color: 'rgb(var(--fg-muted))' }} />
          </span>
          <p className="mt-4 text-sm font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{tr.empty}</p>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>{tr.emptyHint}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Overall */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label={tr.total} value={String(stats.overall.total)} />
            <StatCard label={tr.correct} value={String(stats.overall.correct)} />
            <StatCard
              label={tr.accuracy}
              value={stats.overall.total > 0 ? `${Math.round(stats.overall.rate * 100)}%` : '—'}
              highlight={stats.overall.rate > 0.55}
            />
          </div>

          {/* By confidence */}
          <section className="rounded-2xl p-5" style={CARD}>
            <h2 className="mb-4 text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{tr.byConfidence}</h2>
            <div className="space-y-3">
              {[...stats.byConfidence].reverse().map(({ stars, stats: s }) => (
                <div key={stars} className="flex items-center gap-4">
                  <StarRating stars={stars as 1 | 2 | 3 | 4 | 5} />
                  <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'rgb(var(--pitch-800))' }}>
                    {s.total > 0 && (
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${s.rate * 100}%`, background: 'rgb(var(--accent))' }}
                      />
                    )}
                  </div>
                  <span className="tabular w-28 text-right text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
                    {s.total > 0 ? `${s.correct}/${s.total} · ${Math.round(s.rate * 100)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{tr.highConfNote}</p>
          </section>

          {/* ROI */}
          <section className="rounded-2xl p-5" style={CARD}>
            <h2 className="mb-1 text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{tr.roiTitle}</h2>
            <p className="mb-4 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{tr.roiDesc}</p>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label={tr.totalBets} value={String(stats.roiSimulation.totalBets)} />
              <StatCard
                label={tr.roi}
                value={stats.roiSimulation.totalBets > 0 ? `${(stats.roiSimulation.roi * 100).toFixed(1)}%` : '—'}
                highlight={stats.roiSimulation.roi > 0}
              />
            </div>
          </section>
        </div>
      )}

      {/* Honesty note */}
      <div className="mt-6 rounded-2xl px-5 py-4" style={CARD}>
        <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>
          <ShieldCheck className="h-4 w-4" style={{ color: 'rgb(var(--accent))' }} />
          {tr.trustTitle}
        </p>
        <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>
          {tr.trust.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span style={{ color: 'rgb(var(--accent))' }}>•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HistorySection({ history }: { history: PredictionHistoryItem[] }) {
  const { t } = useLocale();
  const h = t.trackRecord.history;

  const verdict = (item: PredictionHistoryItem) => {
    if (item.status !== 'resolved' || !item.verdict) {
      return { label: h.pending, color: 'rgb(var(--fg-muted))', Icon: MinusCircle };
    }
    if (item.verdict === 'won') return { label: h.won, color: POSITIVE, Icon: CheckCircle2 };
    if (item.verdict === 'partial') return { label: h.partial, color: '#f59e0b', Icon: MinusCircle };
    return { label: h.lost, color: NEGATIVE, Icon: XCircle };
  };

  return (
    <section className="rounded-2xl p-5" style={CARD}>
      <div className="flex items-center gap-2.5">
        <History className="h-5 w-5" style={{ color: 'rgb(var(--accent))' }} />
        <h2 className="text-base font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{h.title}</h2>
      </div>
      <p className="mt-1.5 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{h.hint}</p>

      {history.length === 0 ? (
        <div className="mt-4 rounded-xl px-4 py-6 text-center text-sm" style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-muted))' }}>
          {h.empty}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {history.map((item) => {
            const v = verdict(item);
            return (
              <div key={item.fixtureId + item.createdAt} className="rounded-xl px-3.5 py-2.5" style={{ background: 'rgb(var(--pitch-800))' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: 'rgb(var(--fg-card))' }}>{item.match}</p>
                    <p className="truncate text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>
                      {item.league} · {new Date(item.kickoff).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold" style={{ color: v.color }}>
                    <v.Icon className="h-4 w-4" />
                    {v.label}
                    {item.finalScore && (
                      <span className="tabular ml-1" style={{ color: 'rgb(var(--fg-secondary))' }}>
                        {item.finalScore.home}:{item.finalScore.away}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
                  <span>
                    {h.pick}: <span style={{ color: 'rgb(var(--fg-secondary))' }}>{MARKET_LABEL[item.market] ?? item.market} — {item.pick}</span>
                    <span className="ml-1.5 tabular" style={{ color: 'rgb(var(--accent))' }}>{Math.round(item.probability * 100)}%</span>
                  </span>
                  {item.status === 'resolved' && item.total != null && item.wonCount != null && (
                    <span className="tabular">{h.wonOf(item.wonCount, item.total)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BacktestSection({ backtest }: { backtest: BacktestSummary | null }) {
  const { t } = useLocale();
  const bt = t.trackRecord.backtest;

  return (
    <section className="rounded-2xl p-5" style={CARD}>
      <div className="flex items-center gap-2.5">
        <Target className="h-5 w-5" style={{ color: 'rgb(var(--accent))' }} />
        <h2 className="text-base font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{bt.title}</h2>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>{bt.subtitle}</p>

      <AnalysisStages stages={bt.stages} title={bt.methodTitle} />

      {!backtest ? (
        <div className="mt-5 rounded-xl px-4 py-6 text-center" style={{ background: 'rgb(var(--pitch-800))' }}>
          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{bt.empty}</p>
          <p className="mt-1.5 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{bt.emptyHint}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Headline metrics */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label={bt.roi} value={`${(backtest.roi * 100).toFixed(1)}%`} highlight={backtest.roi > 0} negative={backtest.roi < 0} />
            <StatCard label={bt.hitRate} value={`${Math.round(backtest.hitRate * 100)}%`} highlight={backtest.hitRate > 0.5} />
            <StatCard label={bt.avgOdds} value={backtest.avgOdds.toFixed(2)} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <StatCard label={bt.recommended} value={String(backtest.recommended)} small />
            <StatCard label={bt.won} value={String(backtest.won)} small highlight />
            <StatCard label={bt.lost} value={String(backtest.lost)} small negative />
            <StatCard label={bt.skipped} value={String(backtest.skipped)} small />
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgb(var(--pitch-800))' }}>
            <span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{bt.profit}: </span>
            <span className="tabular text-sm font-bold" style={{ color: backtest.profit >= 0 ? POSITIVE : NEGATIVE }}>
              {backtest.profit >= 0 ? '+' : ''}{backtest.profit.toFixed(2)}
            </span>
          </div>

          {/* By market */}
          {backtest.byMarket.length > 0 && (
            <SegmentBlock
              title={bt.byMarket}
              betsLabel={bt.bets}
              rows={backtest.byMarket.map((m) => ({ ...m, key: MARKET_LABEL[m.key] ?? m.key }))}
            />
          )}
          {/* By league */}
          {backtest.byLeague.length > 0 && (
            <SegmentBlock title={bt.byLeague} betsLabel={bt.bets} rows={backtest.byLeague} />
          )}

          {/* Per-match picks */}
          <div>
            <h3 className="mb-2.5 text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{bt.picks}</h3>
            <div className="space-y-2">
              {backtest.picks.map((p, i) => (
                <PickRow key={i} pick={p} />
              ))}
            </div>
          </div>

          {/* Models */}
          <div className="flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
              <Cpu className="h-3.5 w-3.5" /> {bt.modelsLabel}:
            </span>
            {backtest.models.map((m) => (
              <span
                key={m}
                className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-secondary))' }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// Циклическая «живая» подсветка этапов анализа (spec §10).
function AnalysisStages({ stages, title }: { stages: readonly string[]; title: string }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % stages.length), 1100);
    return () => clearInterval(id);
  }, [stages.length]);

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: 'rgb(var(--pitch-800))' }}>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>
        <Sparkles className="h-3.5 w-3.5" style={{ color: 'rgb(var(--accent))' }} /> {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {stages.map((s, i) => {
          const isActive = i === active;
          return (
            <span
              key={i}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] transition-all duration-500"
              style={{
                background: isActive ? 'rgb(var(--accent) / 0.16)' : 'rgb(var(--pitch-900))',
                color: isActive ? 'rgb(var(--accent))' : 'rgb(var(--fg-muted))',
                border: `1px solid ${isActive ? 'rgb(var(--accent) / 0.4)' : 'transparent'}`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full transition-all duration-500"
                style={{ background: isActive ? 'rgb(var(--accent))' : 'rgb(var(--fg-muted) / 0.4)' }}
              />
              {s}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SegmentBlock({
  title,
  betsLabel,
  rows,
}: {
  title: string;
  betsLabel: string;
  rows: { key: string; bets: number; won: number; roi: number }[];
}) {
  return (
    <div>
      <h3 className="mb-2.5 text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{title}</h3>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3">
            <span className="w-32 truncate text-xs" style={{ color: 'rgb(var(--fg-secondary))' }}>{r.key}</span>
            <span className="tabular flex-1 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
              {r.won}/{r.bets} {betsLabel}
            </span>
            <span className="tabular w-16 text-right text-xs font-semibold" style={{ color: r.roi >= 0 ? POSITIVE : NEGATIVE }}>
              {r.roi >= 0 ? '+' : ''}{(r.roi * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PickRow({ pick }: { pick: BacktestPick }) {
  const { t } = useLocale();
  const bt = t.trackRecord.backtest;
  const [open, setOpen] = useState(false);

  const resultColor =
    pick.result === 'won' ? POSITIVE : pick.result === 'lost' ? NEGATIVE : 'rgb(var(--fg-muted))';
  const ResultIcon = pick.result === 'won' ? CheckCircle2 : pick.result === 'lost' ? XCircle : MinusCircle;
  const hasDetails = Boolean(
    pick.summary || pick.rationale || pick.consensus || (pick.keyFactors && pick.keyFactors.length),
  );

  return (
    <div className="rounded-xl" style={{ background: 'rgb(var(--pitch-800))' }}>
      <button
        type="button"
        onClick={() => hasDetails && setOpen((o) => !o)}
        className="flex w-full flex-col gap-1.5 px-3.5 py-2.5 text-left"
        style={{ cursor: hasDetails ? 'pointer' : 'default' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" style={{ color: 'rgb(var(--fg-card))' }}>{pick.match}</p>
            <p className="truncate text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{pick.league}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5" style={{ color: resultColor }}>
            <ResultIcon className="h-4 w-4" />
            <span className="tabular text-xs font-semibold">{pick.actualResult}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          {pick.recommended ? (
            <span className="text-xs" style={{ color: 'rgb(var(--fg-secondary))' }}>
              {pick.outcomeLabel}
              {pick.odds != null && <span style={{ color: 'rgb(var(--fg-muted))' }}> @ {pick.odds.toFixed(2)}</span>}
              {pick.valueEdge != null && (
                <span className="ml-1.5 font-semibold" style={{ color: 'rgb(var(--accent))' }}>
                  value +{(pick.valueEdge * 100).toFixed(1)}%
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
              {bt.skip} · {bt.noValue}
            </span>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {pick.stars != null && <StarRating stars={pick.stars as 1 | 2 | 3 | 4 | 5} />}
            {hasDetails && (
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200"
                style={{ color: 'rgb(var(--fg-muted))', transform: open ? 'rotate(180deg)' : 'none' }}
              />
            )}
          </div>
        </div>
        {hasDetails && !open && (
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted) / 0.7)' }}>
            {bt.detailsHint}
          </span>
        )}
      </button>

      {open && hasDetails && (
        <div className="space-y-3 border-t px-3.5 py-3" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
          {/* Общее мнение всех моделей (синтез консенсуса) */}
          {pick.summary && (
            <div
              className="rounded-lg p-3"
              style={{ background: 'rgb(var(--accent) / 0.10)', border: '1px solid rgb(var(--accent) / 0.25)' }}
            >
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--accent))' }}>
                <Sparkles className="h-3.5 w-3.5" /> {bt.summaryLabel}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--fg-card))' }}>{pick.summary}</p>
            </div>
          )}
          {/* Вероятность модели vs букмекера */}
          {pick.modelProbability != null && pick.impliedProbability != null && (
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label={bt.modelProb} value={`${Math.round(pick.modelProbability * 100)}%`} />
              <MiniStat label={bt.bookieProb} value={`${Math.round(pick.impliedProbability * 100)}%`} />
              <MiniStat
                label={bt.edgeLabel}
                value={`${pick.valueEdge != null && pick.valueEdge >= 0 ? '+' : ''}${pick.valueEdge != null ? (pick.valueEdge * 100).toFixed(1) : '—'}%`}
                accent
              />
            </div>
          )}
          {pick.consensus && (
            <p className="text-xs" style={{ color: 'rgb(var(--accent))' }}>
              <span className="font-semibold">{bt.consensusLabel}: </span>{pick.consensus}
            </p>
          )}
          {pick.models && pick.models.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
                {bt.modelForecasts}
              </p>
              <div className="space-y-1.5">
                {pick.models.map((m, i) => (
                  <ModelForecast key={i} model={m} ownLabel={bt.ownPick} agreedLabel={bt.agreed} noResponseLabel={bt.noResponse} />
                ))}
              </div>
            </div>
          )}
          {pick.keyFactors && pick.keyFactors.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
                {bt.keyFactors}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {pick.keyFactors.map((f, i) => (
                  <span
                    key={i}
                    className="rounded-md px-2 py-0.5 text-[11px]"
                    style={{ background: 'rgb(var(--pitch-900))', color: 'rgb(var(--fg-secondary))' }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
          {pick.rationale && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
                {bt.reasoning}
              </p>
              <p className="whitespace-pre-line text-xs leading-relaxed" style={{ color: 'rgb(var(--fg-secondary))' }}>
                {pick.rationale}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModelForecast({
  model,
  ownLabel,
  agreedLabel,
  noResponseLabel,
}: {
  model: BacktestModelView;
  ownLabel: string;
  agreedLabel: string;
  noResponseLabel: string;
}) {
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgb(var(--pitch-900))' }}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{model.modelId}</span>
        {model.error ? (
          <span className="text-[11px]" style={{ color: NEGATIVE }}>· {noResponseLabel}</span>
        ) : (
          <>
            {model.probability != null && (
              <span className="tabular text-[11px] font-medium" style={{ color: 'rgb(var(--fg-secondary))' }}>
                {Math.round(model.probability * 100)}%
              </span>
            )}
            {model.ownOutcomeLabel && (
              <span className="text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>
                {ownLabel}: {model.ownOutcomeLabel}
              </span>
            )}
            {model.agreed && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: 'rgb(var(--accent) / 0.16)', color: 'rgb(var(--accent))' }}
              >
                ✓ {agreedLabel}
              </span>
            )}
          </>
        )}
      </div>
      {model.rationale && (
        <p className="mt-1 text-[11px] leading-snug" style={{ color: 'rgb(var(--fg-muted))' }}>{model.rationale}</p>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: 'rgb(var(--pitch-900))' }}>
      <div className="tabular text-sm font-bold" style={{ color: accent ? 'rgb(var(--accent))' : 'rgb(var(--fg-primary))' }}>{value}</div>
      <div className="text-[10px] leading-tight" style={{ color: 'rgb(var(--fg-muted))' }}>{label}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
  negative = false,
  small = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
  small?: boolean;
}) {
  const color = negative ? NEGATIVE : highlight ? POSITIVE : 'rgb(var(--fg-primary))';
  return (
    <div className="rounded-2xl p-4 text-center" style={CARD}>
      <div className={`tabular font-bold ${small ? 'text-xl' : 'text-2xl'}`} style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{label}</div>
    </div>
  );
}
