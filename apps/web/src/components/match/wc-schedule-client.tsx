'use client';

import { useEffect, useState } from 'react';
import type { WorldCupDay } from '@/lib/api-client';
import type { PredictionDetail } from '@ai-score/shared';
import { ASSET_BASE, STATIC_MODE } from '@/lib/lvs-data';
import { DayGroup } from './day-group';
import { WcScheduleEmpty } from './wc-status';

// Расписание ЧМ. Дуал-режим: серверные данные (dev с бэкендом) или статический
// снимок data/wc-schedule.json (GitHub Pages — без бэкенда). В статике также
// подгружаем полный AI-анализ матчей (predictions.json) для раскрытия по клику.
export function WcScheduleClient({ initialDays }: { initialDays: WorldCupDay[] }) {
  const [days, setDays] = useState<WorldCupDay[]>(initialDays);
  const [predictions, setPredictions] = useState<Record<number, PredictionDetail>>({});

  useEffect(() => {
    if (initialDays.length === 0) {
      fetch(`${ASSET_BASE}/data/wc-schedule.json`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : []))
        .then((d: WorldCupDay[]) => setDays(d))
        .catch(() => {});
    }
    if (STATIC_MODE) {
      fetch(`${ASSET_BASE}/data/predictions.json`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : {}))
        .then((m: Record<number, PredictionDetail>) => setPredictions(m))
        .catch(() => {});
    }
  }, [initialDays]);

  if (!days.length) return <WcScheduleEmpty />;

  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      {days.map(({ date, fixtures }) => (
        <DayGroup key={date} date={date} fixtures={fixtures} isToday={date === today} predictions={predictions} />
      ))}
    </div>
  );
}
