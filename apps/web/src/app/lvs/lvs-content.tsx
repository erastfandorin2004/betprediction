'use client';

import Image from 'next/image';
import type { LvsDay } from '@ai-score/shared';
import { useLocale } from '@/components/i18n/locale-provider';
import { LvsFixtureCard } from '@/components/match/lvs-fixture-card';

export function LvsContent({ days }: { days: LvsDay[] }) {
  const { t, locale } = useLocale();
  const L = t.lvs;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Hero ЛВС — кубок мира ФИФА + заголовок */}
      <header className="relative mb-6 overflow-hidden rounded-3xl border shadow-lg" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
        <div className="relative aspect-[16/10] w-full sm:aspect-[16/9]">
          <Image
            src="/lvs-hero.jpg"
            alt="Кубок мира ФИФА"
            fill
            priority
            unoptimized
            sizes="(max-width: 768px) 100vw, 680px"
            className="object-cover object-[center_42%]"
          />
          {/* затемнение снизу под текст */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(0deg, rgba(6,8,22,0.96) 2%, rgba(6,8,22,0.6) 30%, rgba(6,8,22,0.12) 55%, rgba(6,8,22,0.25) 100%)' }}
          />
          {/* мультиколор-полоса ЧМ сверху */}
          <div className="absolute inset-x-0 top-0 flex h-1.5">
            <i className="flex-1" style={{ background: '#e4002b' }} />
            <i className="flex-1" style={{ background: '#6a1fe0' }} />
            <i className="flex-1" style={{ background: '#2e5bff' }} />
            <i className="flex-1" style={{ background: '#00c2a3' }} />
            <i className="flex-1" style={{ background: '#c7f000' }} />
          </div>
          {/* бейдж сверху-слева */}
          <span
            className="absolute left-5 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm sm:left-7"
            style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)' }}
          >
            🏆 ЧМ-2026 · LVS
          </span>
          {/* контент снизу */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-6 pb-5 sm:px-8 sm:pb-7">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:text-[2rem]">{L.title}</h1>
            <p className="max-w-md text-sm leading-relaxed text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">{L.subtitle}</p>
          </div>
        </div>
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
