import { Suspense } from 'react';
import { api, type WorldCupDay } from '@/lib/api-client';
import { DayGroup } from '@/components/match/day-group';
import { WcHeader } from '@/components/match/wc-header';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <WcHeader />

      <Suspense fallback={<ScheduleSkeleton />}>
        <WcSchedule />
      </Suspense>
    </div>
  );
}

async function WcSchedule() {
  let days: WorldCupDay[] = [];
  try {
    days = await api.fixtures.worldCup();
  } catch {
    return <WcScheduleError />;
  }

  if (!days.length) return <WcScheduleEmpty />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {days.map(({ date, fixtures }) => (
        <DayGroup key={date} date={date} fixtures={fixtures} isToday={date === today} />
      ))}
    </div>
  );
}

// Thin client wrappers to get translated error/empty messages
import { WcScheduleError, WcScheduleEmpty } from '@/components/match/wc-status';

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
