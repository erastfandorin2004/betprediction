'use client';

import type { LvsHistoryItem, LvsResultStatus } from '@ai-score/shared';
import { useLocale } from '@/components/i18n/locale-provider';
import { History, Check, X, Minus } from 'lucide-react';

const STATUS_COLOR: Record<LvsResultStatus, string> = {
  won: '#22c55e',
  partial: '#f59e0b',
  lost: '#ef4444',
};

export function LvsHistoryContent({ history }: { history: LvsHistoryItem[] }) {
  const { t, locale } = useLocale();
  const L = t.lvs;

  const statusLabel = (s: LvsResultStatus) => (s === 'won' ? L.statusWon : s === 'partial' ? L.statusPartial : L.statusLost);
  const StatusIcon = (s: LvsResultStatus) => (s === 'won' ? Check : s === 'partial' ? Minus : X);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>
          <History className="h-6 w-6" style={{ color: 'rgb(var(--accent))' }} />
          {L.historyTitle}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{L.historySubtitle}</p>
      </header>

      {history.length === 0 ? (
        <p className="rounded-2xl px-4 py-10 text-center text-sm" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
          {L.historyEmpty}
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((h) => {
            const Icon = StatusIcon(h.resultStatus);
            const color = STATUS_COLOR[h.resultStatus];
            return (
              <div key={`${h.fixtureId}-${h.resolvedAt}`} className="overflow-hidden rounded-2xl" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgb(var(--pitch-700))' }}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{h.match}</p>
                    <p className="text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{formatDate(h.kickoff, locale)}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `${color}1f`, color }}>
                    <Icon className="h-3.5 w-3.5" /> {statusLabel(h.resultStatus)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
                  <Compare label={L.outcome} predicted={h.predictedOutcomeLabel} actual={h.actualOutcomeLabel} hit={h.predictedOutcome === h.actualOutcome} L={L} />
                  <Compare
                    label={L.exactScore}
                    predicted={`${h.predictedScore.home}:${h.predictedScore.away}`}
                    actual={`${h.actualScore.home}:${h.actualScore.away}`}
                    hit={h.predictedScore.home === h.actualScore.home && h.predictedScore.away === h.actualScore.away}
                    L={L}
                  />
                </div>

                <div className="px-4 pb-3">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{L.scorers}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {h.scorers.map((s, i) => (
                      <span key={i} className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: s.scored ? '#22c55e1f' : 'rgb(var(--pitch-800))', color: s.scored ? '#22c55e' : 'rgb(var(--fg-muted))' }}>
                        {s.scored ? '✓' : '✗'} {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Compare({ label, predicted, actual, hit, L }: { label: string; predicted: string; actual: string; hit: boolean; L: { predicted: string; actual: string } }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'rgb(var(--pitch-800))' }}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{label}</p>
      <div className="flex items-center justify-between">
        <span style={{ color: 'rgb(var(--fg-muted))' }}>{L.predicted}: <b style={{ color: hit ? '#22c55e' : 'rgb(var(--fg-card))' }}>{predicted}</b></span>
        <span style={{ color: 'rgb(var(--fg-muted))' }}>{L.actual}: <b style={{ color: 'rgb(var(--fg-card))' }}>{actual}</b></span>
      </div>
    </div>
  );
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}
