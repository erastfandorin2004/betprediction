'use client';

import { useLocale } from '@/components/i18n/locale-provider';
import { StarRating } from '@/components/ui/star-rating';
import type { TrackRecordStats } from '@ai-score/shared';

export function TrackRecordContent({ stats }: { stats: TrackRecordStats | null }) {
  const { t } = useLocale();
  const tr = t.trackRecord;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">{tr.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{tr.subtitle}</p>
      </div>

      {!stats ? (
        <div className="card-surface p-8 text-center">
          <p className="text-zinc-500">{tr.empty}</p>
          <p className="mt-2 text-sm text-zinc-700">{tr.emptyHint}</p>
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
          <section className="card-surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-300">{tr.byConfidence}</h2>
            <div className="space-y-3">
              {[...stats.byConfidence].reverse().map(({ stars, stats: s }) => (
                <div key={stars} className="flex items-center gap-4">
                  <StarRating stars={stars as 1 | 2 | 3 | 4 | 5} />
                  <div className="flex-1 overflow-hidden rounded-full bg-pitch-800 h-2">
                    {s.total > 0 && (
                      <div
                        className="h-full rounded-full bg-electric-500 transition-all"
                        style={{ width: `${s.rate * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="tabular w-28 text-right text-sm text-zinc-500">
                    {s.total > 0 ? `${s.correct}/${s.total} · ${Math.round(s.rate * 100)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-700">{tr.highConfNote}</p>
          </section>

          {/* ROI */}
          <section className="card-surface p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-300">{tr.roiTitle}</h2>
            <p className="mb-4 text-xs text-zinc-600">{tr.roiDesc}</p>
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
          <div className="rounded-xl border border-pitch-700 bg-pitch-900/50 px-5 py-4">
            <p className="text-sm font-semibold text-zinc-300">{tr.trustTitle}</p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              {tr.trust.map((item, i) => (
                <li key={i}>• {item}</li>
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
    <div className="card-surface p-4 text-center">
      <div className={`tabular text-2xl font-bold ${highlight ? 'text-goal-400' : 'text-zinc-100'}`}>{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{label}</div>
    </div>
  );
}
