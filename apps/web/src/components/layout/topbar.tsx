'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Zap } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { logout } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useLocale } from '@/components/i18n/locale-provider';
import { BrandLogo } from '@/components/brand/brand-logo';
import { useNav } from './nav-context';

const ACCENT = 'rgb(var(--accent))';

// Верхний бар: только токены, язык, тема, вход/регистрация. Навигация — в Sidebar.
// На мобайле слева — бургер (открывает Sidebar) и логотип.
export function Topbar() {
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const router = useRouter();
  const { setOpen } = useNav();

  async function handleLogout() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ai-score-access') : null;
    if (token) await logout(token);
    signOut();
    router.push('/');
  }

  return (
    <header className="app-header sticky top-0 z-30 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4">
        {/* Mobile: бургер + логотип (на десктопе логотип в sidebar) */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Меню"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl md:hidden"
          style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))', color: 'rgb(var(--fg-primary))' }}
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex shrink-0 items-center md:hidden">
          <BrandLogo size={30} wordClassName="text-lg" />
        </Link>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          {/* Tokens */}
          <div
            className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:flex"
            title={t.nav.quotaTitle}
            style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}
          >
            <Zap className="h-3.5 w-3.5" style={{ color: ACCENT, opacity: 0.8 }} />
            <span className="tabular" style={{ color: 'rgb(var(--fg-secondary))' }}>3</span>
            <span
              className="rounded px-1 text-[9px] font-bold tracking-wider"
              style={{ color: 'rgb(var(--fg-muted))', background: 'rgb(var(--pitch-700))' }}
            >
              FREE
            </span>
          </div>

          {/* Language */}
          <button
            onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}
            className="flex items-center gap-0.5 rounded-full px-2.5 py-1.5 text-xs font-semibold"
            style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}
            title={locale === 'ru' ? 'Switch to English' : 'Переключить на русский'}
          >
            <span style={{ color: locale === 'ru' ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-muted))' }}>RU</span>
            <span style={{ color: 'rgb(var(--pitch-600))' }}>/</span>
            <span style={{ color: locale === 'en' ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-muted))' }}>EN</span>
          </button>

          <ThemeToggle />

          {user ? (
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}
            >
              <span className="hidden max-w-[160px] truncate text-xs sm:inline" style={{ color: 'rgb(var(--fg-secondary))' }}>
                {user.email}
              </span>
              <button
                onClick={() => { void handleLogout(); }}
                className="text-xs transition-opacity hover:opacity-60"
                style={{ color: 'rgb(var(--fg-muted))' }}
              >
                {t.auth.signOut}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm transition-opacity hover:opacity-70" style={{ color: 'rgb(var(--fg-muted))' }}>
                {t.auth.signIn}
              </Link>
              <Link
                href="/register"
                className="rounded-full px-4 py-1.5 text-sm font-semibold transition-transform hover:scale-[1.03]"
                style={{ background: `linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent-2)))`, color: 'rgb(var(--on-accent))' }}
              >
                {t.auth.register}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
