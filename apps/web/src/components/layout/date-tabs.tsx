'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { todayIso, tomorrowIso } from '@/lib/format';

const TABS = [
  { label: 'Сегодня', getValue: todayIso },
  { label: 'Завтра', getValue: tomorrowIso },
] as const;

export function DateTabs({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function navigate(date: string) {
    const next = new URLSearchParams(params.toString());
    next.set('date', date);
    router.push(`/?${next.toString()}`);
  }

  return (
    <div className="flex gap-1 rounded-lg bg-pitch-900 p-1">
      {TABS.map(({ label, getValue }) => {
        const value = getValue();
        const active = selectedDate === value;
        return (
          <button
            key={label}
            onClick={() => navigate(value)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
              active
                ? 'bg-electric-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
