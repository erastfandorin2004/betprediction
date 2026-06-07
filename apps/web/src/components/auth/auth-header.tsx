'use client';

import Link from 'next/link';
import { useAuth } from './auth-provider';
import { logout } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useLocale } from '@/components/i18n/locale-provider';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Goal, Trophy, Info, Gem, Zap, Target, History, type LucideIcon } from 'lucide-react';

const ACCENT = 'rgb(var(--accent))';

export function AuthHeader() {
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  type NavItem = { href: string; label: string; Icon: LucideIcon; exact?: boolean };
  // Слева — основные разделы (сегментированный блок). Тарифы — справа.
  const LEFT_NAV: NavItem[] = [
    { href: '/', label: t.nav.matches, Icon: Goal },
    { href: '/track-record', label: t.nav.trackRecord, Icon: Trophy },
    { href: '/lvs', label: t.nav.lvs, Icon: Target, exact: true },
    { href: '/lvs/history', label: t.nav.lvsHistory, Icon: History },
    { href: '/about', label: t.nav.about, Icon: Info },
  ];
  const pricingItem: NavItem = { href: '/pricing', label: t.nav.pricing, Icon: Gem };
  const MOBILE_NAV: NavItem[] = [...LEFT_NAV, pricingItem];

  async function handleLogout() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ai-score-access') : null;
    if (token) await logout(token);
    signOut();
    router.push('/');
  }

  const isActive = (href: string, exact?: boolean) =>
    href === '/' || exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="app-header sticky top-0 z-50 backdrop-blur-xl">
      {/* Light (WC-2026): signature multicolor brandstrip. Dark: subtle hairline. */}
      <div className="flex h-[3px] w-full dark:hidden">
        <i className="flex-1" style={{ background: '#e4002b' }} />
        <i className="flex-1" style={{ background: '#6a1fe0' }} />
        <i className="flex-1" style={{ background: '#2e5bff' }} />
        <i className="flex-1" style={{ background: '#00c2a3' }} />
        <i className="flex-1" style={{ background: '#c7f000' }} />
      </div>
      <div
        className="hidden h-px w-full dark:block"
        style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--accent) / 0.6), rgba(59,130,246,0.6), transparent)' }}
      />

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center transition-transform hover:scale-[1.03]">
          <BrandLogo size={36} wordClassName="text-2xl" />
        </Link>

        {/* Left nav — сегментированный блок разделов с иконками */}
        <nav
          className="ml-2 hidden items-center gap-1 rounded-2xl p-1 md:flex"
          style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}
        >
          {LEFT_NAV.map(({ href, label, Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'nav-chip flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold',
                  active && 'active',
                )}
              >
                <Icon className="h-4 w-4" style={active ? { color: ACCENT } : undefined} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          {/* Тарифы — отдельный чип справа */}
          <Link
            href={pricingItem.href}
            className={cn(
              'nav-chip hidden items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold sm:flex',
              isActive(pricingItem.href) && 'active',
            )}
            style={{ border: '1px solid rgb(var(--pitch-700))' }}
          >
            <pricingItem.Icon className="h-4 w-4" style={isActive(pricingItem.href) ? { color: ACCENT } : undefined} />
            <span>{pricingItem.label}</span>
          </Link>

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
                style={{ background: `linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent-2)))`, color: 'rgb(var(--on-accent))' }}
              >
                {t.auth.register}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav — горизонтальный ряд разделов (на десктопе скрыт) */}
      <nav
        className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-2 md:hidden"
        style={{ borderTop: '1px solid rgb(var(--pitch-700))' }}
      >
        {MOBILE_NAV.map(({ href, label, Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                color: active ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-muted))',
                background: active ? 'rgb(var(--accent) / 0.12)' : 'rgb(var(--pitch-800))',
                boxShadow: active ? 'inset 0 0 0 1px rgb(var(--accent) / 0.28)' : undefined,
              }}
            >
              <Icon className="h-3.5 w-3.5" style={active ? { color: ACCENT } : undefined} />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
