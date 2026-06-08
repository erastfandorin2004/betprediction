import { Suspense } from 'react';
import { api, type WorldCupDay } from '@/lib/api-client';
import { WcHeader } from '@/components/match/wc-header';
import { TestMatchCard } from '@/components/match/test-match-card';
import { WcScheduleClient } from '@/components/match/wc-schedule-client';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <TestMatchCard />
      <WcHeader />

      <Suspense fallback={<ScheduleSkeleton />}>
        <WcSchedule />
      </Suspense>
    </div>
  );
}

async function WcSchedule() {
  // dev/SSR: тянем расписание с бэкенда; статика (Pages) — бэкенда нет, отдаём []
  // и клиент подгрузит снимок data/wc-schedule.json.
  let days: WorldCupDay[] = [];
  try {
    days = await api.fixtures.worldCup();
  } catch {
    days = [];
  }
  return <WcScheduleClient initialDays={days} />;
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="mb-2 h-4 w-32 animate-pulse rounded" style={{ background: 'rgb(var(--pitch-800))' }} />
          {[1, 2, 3].map((j) => (
            <div
              key={j}
              className="h-16 animate-pulse rounded-2xl"
              style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
