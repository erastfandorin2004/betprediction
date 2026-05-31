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
      <div className="mb-2 flex items-center gap-2.5 px-0.5">
        {isToday ? (
          <span
            className="rounded-full px-3 py-0.5 text-xs font-bold"
            style={{ background: 'rgb(var(--fg-primary))', color: 'rgb(var(--pitch-950))' }}
          >
            {t.match.today}
          </span>
        ) : (
          <span
            className="text-sm font-semibold capitalize"
            style={{ color: 'rgb(var(--fg-secondary))' }}
          >
            {formatDayLabel(date, locale)}
          </span>
        )}
        <span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
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
