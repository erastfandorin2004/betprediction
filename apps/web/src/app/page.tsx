import { Suspense } from 'react';
import { api } from '@/lib/api-client';
import { todayIso } from '@/lib/format';
import { DateTabs } from '@/components/layout/date-tabs';
import { MatchFeed } from '@/components/match/match-feed';
import { LeagueGroupSkeleton } from '@/components/ui/skeleton';
import { TrendingUp, Zap, ShieldCheck } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const { date: rawDate } = await searchParams;
  const date = rawDate ?? todayIso();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Live section */}
      <Suspense fallback={null}>
        <LiveSection />
      </Suspense>

      {/* Date tabs + feed */}
      <div className="mt-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">Матчи</h2>
          <Suspense fallback={null}>
            <DateTabs selectedDate={date} />
          </Suspense>
        </div>

        <Suspense
          key={date}
          fallback={
            <div className="space-y-6">
              <LeagueGroupSkeleton />
              <LeagueGroupSkeleton />
            </div>
          }
        >
          <FixtureFeed date={date} />
        </Suspense>
      </div>

      {/* Stats strip */}
      <StatsStrip />
    </div>
  );
}

async function LiveSection() {
  let live: Awaited<ReturnType<typeof api.fixtures.live>> = [];
  try {
    live = await api.fixtures.live();
  } catch {
    return null;
  }

  if (!live.length) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse-slow rounded-full bg-loss-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-loss-400">
          Live — {live.length} {pluralMatches(live.length)}
        </h2>
      </div>
      <MatchFeed fixtures={live} />
    </section>
  );
}

async function FixtureFeed({ date }: { date: string }) {
  let result: Awaited<ReturnType<typeof api.fixtures.list>>;
  try {
    result = await api.fixtures.list({ date, limit: 100 });
  } catch {
    return (
      <p className="py-8 text-center text-sm text-zinc-600">
        Не удалось загрузить матчи — API недоступен
      </p>
    );
  }

  return <MatchFeed fixtures={result.items} />;
}

function StatsStrip() {
  return (
    <div className="mt-12 grid grid-cols-3 gap-3 border-t border-pitch-800 pt-8">
      {[
        { icon: ShieldCheck, label: 'Верифицировано', value: '100%', sub: 'снапшоты до матча' },
        { icon: Zap, label: 'Прогнозов', value: '—', sub: 'запускается' },
        { icon: TrendingUp, label: 'Ансамбль', value: '6 LLM', sub: 'через OpenRouter' },
      ].map(({ icon: Icon, label, value, sub }) => (
        <div key={label} className="card-surface p-4 text-center">
          <Icon className="mx-auto h-5 w-5 text-electric-500" />
          <div className="tabular mt-2 text-2xl font-bold text-zinc-100">{value}</div>
          <div className="mt-0.5 text-xs font-medium text-zinc-400">{label}</div>
          <div className="mt-0.5 text-xs text-zinc-600">{sub}</div>
        </div>
      ))}
    </div>
  );
}

function pluralMatches(n: number): string {
  if (n === 1) return 'матч';
  if (n >= 2 && n <= 4) return 'матча';
  return 'матчей';
}
