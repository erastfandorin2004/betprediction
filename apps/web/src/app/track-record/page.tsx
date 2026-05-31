import { api } from '@/lib/api-client';
import { StarRating } from '@/components/ui/star-rating';
import type { TrackRecordStats } from '@ai-score/shared';

export const metadata = { title: 'Трек-рекорд точности | AI-Score' };

export default async function TrackRecordPage() {
  let stats: TrackRecordStats | null = null;
  try {
    stats = await api.trackRecord.get();
  } catch {
    // API unavailable
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">📊 Трек-рекорд точности</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Все прогнозы зафиксированы до старта матча и никогда не изменяются.
          Это единственный честный способ проверить качество прогнозов.
        </p>
      </div>

      {!stats ? (
        <div className="card-surface p-8 text-center">
          <p className="text-zinc-500">Статистика появится после первых прогнозов</p>
          <p className="mt-2 text-sm text-zinc-700">
            Запусти воркер с OPENROUTER_API_KEY, чтобы начать
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Всего прогнозов" value={String(stats.overall.total)} />
            <StatCard label="Правильных" value={String(stats.overall.correct)} />
            <StatCard
              label="Точность"
              value={stats.overall.total > 0 ? `${Math.round(stats.overall.rate * 100)}%` : '—'}
              highlight={stats.overall.rate > 0.55}
            />
          </div>

          {/* By confidence */}
          <section className="card-surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-300">По уровню уверенности</h2>
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
            <p className="mt-3 text-xs text-zinc-700">
              Прогнозы с высокой уверенностью (★★★★★) должны попадать чаще — это видно на графике.
            </p>
          </section>

          {/* ROI */}
          <section className="card-surface p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-300">ROI симуляция</h2>
            <p className="mb-4 text-xs text-zinc-600">
              Что было бы при ставке 1 ед. на каждый прогноз по среднему коэффициенту рынка
            </p>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Всего ставок" value={String(stats.roiSimulation.totalBets)} />
              <StatCard
                label="ROI"
                value={stats.roiSimulation.totalBets > 0 ? `${(stats.roiSimulation.roi * 100).toFixed(1)}%` : '—'}
                highlight={stats.roiSimulation.roi > 0}
              />
            </div>
          </section>

          {/* Honesty note */}
          <div className="rounded-xl border border-pitch-700 bg-pitch-900/50 px-5 py-4">
            <p className="text-sm font-semibold text-zinc-300">🔒 Почему нам можно доверять</p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              <li>• Каждый прогноз фиксируется immutable snapshot в базе данных</li>
              <li>• Статус «resolved» выставляется автоматически после матча</li>
              <li>• Переписать или удалить прогноз задним числом технически невозможно</li>
              <li>• Вся статистика считается в реальном времени из неизменяемых данных</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="card-surface p-4 text-center">
      <div className={`tabular text-2xl font-bold ${highlight ? 'text-goal-400' : 'text-zinc-100'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-zinc-500">{label}</div>
    </div>
  );
}
