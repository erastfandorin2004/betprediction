'use client';

import type { LvsDay } from '@ai-score/shared';
import { useLocale } from '@/components/i18n/locale-provider';
import { LvsFixtureCard } from '@/components/match/lvs-fixture-card';
import { Target } from 'lucide-react';

export function LvsContent({ days }: { days: LvsDay[] }) {
  const { t, locale } = useLocale();
  const L = t.lvs;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>
          <Target className="h-6 w-6" style={{ color: 'rgb(var(--accent))' }} />
          {L.title}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{L.subtitle}</p>
      </header>

      {days.length === 0 ? (
        <p className="rounded-2xl px-4 py-10 text-center text-sm" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
          {L.empty}
        </p>
      ) : (
        <div className="space-y-6">
          {days.map(({ date, fixtures }) => (
            <section key={date}>
              <div className="mb-2.5 flex items-center gap-2 px-1">
                {date === today ? (
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--pitch-950))' }}>
                    {t.match.today}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'rgb(var(--fg-muted))' }}>
                    {formatDayLabel(date, locale)}
                  </span>
                )}
                <span style={{ color: 'rgb(var(--pitch-600))' }}>·</span>
                <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--fg-muted))' }}>
                  {fixtures.length} {t.match.countSuffix(fixtures.length)}
                </span>
              </div>
              <div className="space-y-2.5">
                {fixtures.map((f) => <LvsFixtureCard key={f.id} fixture={f} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDayLabel(dateStr: string, locale: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
}
