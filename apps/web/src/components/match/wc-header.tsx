'use client';

import { useLocale } from '@/components/i18n/locale-provider';

export function WcHeader() {
  const { t } = useLocale();
  return (
    <div className="mb-8 flex items-center gap-4">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}
      >
        <span className="text-3xl">🏆</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--fg-primary))' }}>
          FIFA World Cup 2026
        </h1>
        <p className="text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
          {t.wc.subtitle}
        </p>
      </div>
    </div>
  );
}
