'use client';

import { Trophy } from 'lucide-react';
import { useLocale } from '@/components/i18n/locale-provider';

export function WcHeader() {
  const { t } = useLocale();
  return (
    <div className="mb-8 flex items-center gap-3.5">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: 'rgb(var(--accent) / 0.12)', border: '1px solid rgb(var(--accent) / 0.25)' }}
      >
        <Trophy className="h-5 w-5" style={{ color: 'rgb(var(--accent))' }} />
      </div>
      <div>
        <h1 className="text-[1.7rem] font-bold leading-none tracking-tight" style={{ color: 'rgb(var(--fg-primary))' }}>
          FIFA World Cup 2026
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
          {t.wc.subtitle}
        </p>
      </div>
    </div>
  );
}
