'use client';

import { BarChart3, ShieldCheck } from 'lucide-react';
import { useLocale } from '@/components/i18n/locale-provider';
import { StarRating } from '@/components/ui/star-rating';
import type { TrackRecordStats } from '@ai-score/shared';

const CARD = {
  background: 'rgb(var(--pitch-900))',
  border: '1px solid rgb(var(--pitch-700))',
} as const;

const POSITIVE = '#22c55e';

export function TrackRecordContent({ stats }: { stats: TrackRecordStats | null }) {
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

      {!stats ? (
        <div className="flex flex-col items-center rounded-2xl px-6 py-12 text-center" style={CARD}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgb(var(--pitch-800))' }}>
            <BarChart3 className="h-7 w-7" style={{ color: 'rgb(var(--fg-muted))' }} />
          </span>
          <p className="mt-4 text-sm font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{tr.empty}</p>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>{tr.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-6">
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

          {/* Honesty note */}
          <div className="rounded-2xl px-5 py-4" style={CARD}>
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
      )}
    </div>
  );
}

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl p-4 text-center" style={CARD}>
      <div className="tabular text-2xl font-bold" style={{ color: highlight ? POSITIVE : 'rgb(var(--fg-primary))' }}>{value}</div>
      <div className="mt-0.5 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{label}</div>
    </div>
  );
}
