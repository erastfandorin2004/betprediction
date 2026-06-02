'use client';

import { useLocale } from '@/components/i18n/locale-provider';
import { MatchCard } from './match-card';
import type { WorldCupDay } from '@/lib/api-client';

export function DayGroup({
  date,
  fixtures,
  isToday,
}: {
  date: string;
  fixtures: WorldCupDay['fixtures'];
  isToday: boolean;
}) {
  const { t, locale } = useLocale();

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2 px-1">
        {isToday ? (
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--pitch-950))' }}
          >
            {t.match.today}
          </span>
        ) : (
          <span
            className="text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ color: 'rgb(var(--fg-muted))' }}
          >
            {formatDayLabel(date, locale)}
          </span>
        )}
        <span style={{ color: 'rgb(var(--pitch-600))' }}>·</span>
        <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--fg-muted))' }}>
          {fixtures.length} {t.match.countSuffix(fixtures.length)}
        </span>
      </div>

      <div className="space-y-1.5">
        {fixtures.map((f) => (
          <MatchCard key={f.id} fixture={f} />
        ))}
      </div>
    </section>
  );
}

function formatDayLabel(dateStr: string, locale: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}
