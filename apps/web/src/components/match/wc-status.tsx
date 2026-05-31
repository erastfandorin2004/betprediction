'use client';

import { useLocale } from '@/components/i18n/locale-provider';

export function WcScheduleError() {
  const { t } = useLocale();
  return (
    <p className="py-16 text-center text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
      {t.match.loadError}
    </p>
  );
}

export function WcScheduleEmpty() {
  const { t } = useLocale();
  return (
    <div className="py-16 text-center">
      <p className="text-3xl">⚽</p>
      <p className="mt-3 text-sm" style={{ color: 'rgb(var(--fg-secondary))' }}>
        {t.match.loading}
      </p>
    </div>
  );
}
