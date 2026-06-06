'use client';

import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useLocale } from '@/components/i18n/locale-provider';

// Test fixtures seeded for the on-demand AI-prediction flow.
const TEST_MATCHES = [
  { id: 990104, ru: 'Португалия — Чили', en: 'Portugal — Chile' },
  { id: 990105, ru: 'Румыния — Уэльс', en: 'Romania — Wales' },
  { id: 990106, ru: 'США — Германия', en: 'USA — Germany' },
  { id: 990100, ru: 'Швеция — Греция', en: 'Sweden — Greece' },
  { id: 990101, ru: 'Франция — Кот-д’Ивуар', en: "France — Côte d'Ivoire" },
  { id: 990102, ru: 'Мексика — Сербия', en: 'Mexico — Serbia' },
  { id: 990103, ru: 'Молдова — Болгария', en: 'Moldova — Bulgaria' },
];

export function TestMatchCard() {
  const { t, locale } = useLocale();
  const p = t.prediction;
  const sub = locale === 'ru' ? 'Товарищеский матч · сегодня' : 'Friendly · today';

  return (
    <div
      className="mb-6 overflow-hidden rounded-2xl"
      style={{ background: 'rgb(var(--accent) / 0.08)', border: '1px solid rgb(var(--accent) / 0.3)' }}
    >
      <div className="flex items-center gap-2 px-5 pt-4">
        <Sparkles className="h-4 w-4" style={{ color: 'rgb(var(--accent))' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--accent))' }}>
          {p.testMatchTitle}
        </span>
      </div>
      <div className="space-y-1.5 p-3">
        {TEST_MATCHES.map((m) => (
          <Link
            key={m.id}
            href={`/fixtures/${m.id}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[rgb(var(--accent)/0.1)]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>
                {locale === 'ru' ? m.ru : m.en}
              </p>
              <p className="truncate text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{sub} · {p.testMatchHint}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0" style={{ color: 'rgb(var(--accent))' }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
