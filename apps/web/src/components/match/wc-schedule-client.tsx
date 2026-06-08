'use client';

import { useEffect, useState } from 'react';
import type { WorldCupDay } from '@/lib/api-client';
import { ASSET_BASE } from '@/lib/lvs-data';
import { DayGroup } from './day-group';
import { WcScheduleEmpty } from './wc-status';

// Расписание ЧМ. Дуал-режим: серверные данные (dev с бэкендом) или статический
// снимок data/wc-schedule.json (GitHub Pages — без бэкенда).
export function WcScheduleClient({ initialDays }: { initialDays: WorldCupDay[] }) {
  const [days, setDays] = useState<WorldCupDay[]>(initialDays);

  useEffect(() => {
    if (initialDays.length > 0) return;
    fetch(`${ASSET_BASE}/data/wc-schedule.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: WorldCupDay[]) => setDays(d))
      .catch(() => {});
  }, [initialDays]);

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
