'use client';

import Link from 'next/link';
import { useAuth } from './auth-provider';
import { logout } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useLocale } from '@/components/i18n/locale-provider';
import { cn } from '@/lib/utils';

export function AuthHeader() {
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const NAV_LINKS = [
    { href: '/', label: t.nav.matches },
    { href: '/track-record', label: t.nav.trackRecord },
  ];

  async function handleLogout() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ai-score-access') : null;
    if (token) await logout(token);
    signOut();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-zinc-50/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="relative mx-auto flex h-14 max-w-7xl items-center px-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="text-sm font-bold tracking-widest text-zinc-900 dark:text-white">
            AI-SCORE
          </span>
        </Link>

        {/* Nav — centered */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <nav className="flex items-center gap-0.5 rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                  pathname === href
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}
            className="flex items-center gap-0.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold transition-all dark:border-zinc-800 dark:bg-zinc-900"
            title={locale === 'ru' ? 'Switch to English' : 'Переключить на русский'}
          >
            <span className={cn('transition-opacity', locale === 'ru' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400')}>RU</span>
            <span className="mx-0.5 text-zinc-300 dark:text-zinc-700">/</span>
            <span className={cn('transition-opacity', locale === 'en' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400')}>EN</span>
          </button>

          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</span>
              <button
                onClick={() => { void handleLogout(); }}
                className="text-xs text-zinc-400 transition-opacity hover:opacity-60 dark:text-zinc-500"
              >
                {t.auth.signOut}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm text-zinc-500 transition-opacity hover:opacity-70 dark:text-zinc-400"
              >
                {t.auth.signIn}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-zinc-900"
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
