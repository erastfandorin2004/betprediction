'use client';

import Link from 'next/link';
import { useLocale } from '@/components/i18n/locale-provider';

export function Footer() {
  const { t } = useLocale();
  return (
    <footer
      className="py-8 text-center text-xs"
      style={{ borderTop: '1px solid rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}
    >
      <div className="mb-3 flex items-center justify-center gap-4">
        <Link href="/" className="transition-colors hover:opacity-80" style={{ color: 'rgb(var(--fg-secondary))' }}>
          {t.nav.matches}
        </Link>
        <Link href="/track-record" className="transition-colors hover:opacity-80" style={{ color: 'rgb(var(--fg-secondary))' }}>
          {t.nav.trackRecord}
        </Link>
        <Link href="/about" className="transition-colors hover:opacity-80" style={{ color: 'rgb(var(--fg-secondary))' }}>
          {t.nav.about}
        </Link>
      </div>
      <p>{t.footer}</p>
      <p className="mt-1.5">© 2026 AI-Score</p>
    </footer>
  );
}
