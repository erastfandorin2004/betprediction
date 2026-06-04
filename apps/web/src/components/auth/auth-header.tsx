'use client';

import Link from 'next/link';
import { useAuth } from './auth-provider';
import { logout } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useLocale } from '@/components/i18n/locale-provider';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Goal, Trophy, Info, Gem, Zap, type LucideIcon } from 'lucide-react';

const ACCENT = 'rgb(var(--accent))';

export function AuthHeader() {
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const NAV: { href: string; label: string; Icon: LucideIcon }[] = [
    { href: '/', label: t.nav.matches, Icon: Goal },
    { href: '/track-record', label: t.nav.trackRecord, Icon: Trophy },
    { href: '/about', label: t.nav.about, Icon: Info },
    { href: '/pricing', label: t.nav.pricing, Icon: Gem },
  ];

  async function handleLogout() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ai-score-access') : null;
    if (token) await logout(token);
    signOut();
    router.push('/');
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{ background: 'rgb(var(--pitch-950) / 0.78)', borderBottom: '1px solid rgb(var(--pitch-700))' }}
    >
      {/* gradient hairline */}
      <div
        className="h-px w-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--accent) / 0.6), rgba(59,130,246,0.6), transparent)' }}
      />

      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          <BrandLogo size={28} />
        </Link>

        {/* Nav — icons + gradient underline indicator */}
        <nav className="ml-2 hidden items-center gap-0.5 md:flex">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                style={{ color: active ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-muted))' }}
              >
                <Icon className="h-4 w-4 transition-colors" style={active ? { color: ACCENT } : undefined} />
                <span>{label}</span>
                <span
                  className={cn(
                    'absolute inset-x-2.5 bottom-0 h-0.5 origin-center rounded-full transition-transform duration-200',
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50',
                  )}
                  style={{ background: `linear-gradient(90deg, ${ACCENT}, #3b82f6)` }}
                />
              </Link>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          {/* Requests-left badge — subtle, neutral surface with a soft accent icon */}
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

          {/* Language toggle */}
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
                style={{ background: `linear-gradient(90deg, rgb(var(--accent)), #c46a2c)`, color: '#04140a' }}
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
