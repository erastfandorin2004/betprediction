'use client';

import { useLocale } from '@/components/i18n/locale-provider';

export function Footer() {
  const { t } = useLocale();
  return (
    <footer
      className="py-8 text-center text-xs"
      style={{ borderTop: '1px solid rgb(var(--pitch-700))', color: 'rgb(var(--text-muted))' }}
    >
      <p>{t.footer}</p>
      <p className="mt-1.5">© 2026 AI-Score</p>
    </footer>
  );
}
