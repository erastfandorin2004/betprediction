'use client';

import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useLocale } from '@/components/i18n/locale-provider';

// Test fixture seeded for the on-demand AI-prediction flow (Sweden — Greece).
const TEST_FIXTURE_ID = 990100;

export function TestMatchCard() {
  const { t, locale } = useLocale();
  const p = t.prediction;
  const teams = locale === 'ru' ? 'Швеция — Греция' : 'Sweden — Greece';
  const sub = locale === 'ru' ? 'Товарищеский матч · сегодня' : 'Friendly · today';

  return (
    <Link
      href={`/fixtures/${TEST_FIXTURE_ID}`}
      className="mb-6 block overflow-hidden rounded-2xl transition-transform hover:scale-[1.01]"
      style={{ background: 'rgb(var(--accent) / 0.08)', border: '1px solid rgb(var(--accent) / 0.3)' }}
    >
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgb(var(--accent) / 0.16)' }}>
          <Sparkles className="h-5 w-5" style={{ color: 'rgb(var(--accent))' }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--accent))' }}>
            {p.testMatchTitle}
          </p>
          <p className="mt-0.5 truncate text-base font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{teams}</p>
          <p className="truncate text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{sub} · {p.testMatchHint}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0" style={{ color: 'rgb(var(--accent))' }} />
      </div>
    </Link>
  );
}
