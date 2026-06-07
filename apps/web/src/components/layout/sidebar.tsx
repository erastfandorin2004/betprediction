'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/i18n/locale-provider';
import { useNav } from './nav-context';
import { BrandMark } from '@/components/brand/brand-logo';
import { Goal, Trophy, Target, History, Info, Gem, type LucideIcon } from 'lucide-react';

// Вертикальное боковое меню в стиле референса: тёмный блок слева на всю высоту,
// пункты заглавными буквами с иконками, активный пункт залит красным WC-2026.
// Десктоп — всегда виден; мобайл — выезжает по бургеру (Topbar) поверх backdrop.
export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { open, setOpen } = useNav();

  type Item = { href: string; label: string; Icon: LucideIcon; exact?: boolean };
  const NAV: Item[] = [
    { href: '/', label: t.nav.matches, Icon: Goal },
    { href: '/track-record', label: t.nav.trackRecord, Icon: Trophy },
    { href: '/lvs', label: t.nav.lvs, Icon: Target, exact: true },
    { href: '/lvs/history', label: t.nav.lvsHistory, Icon: History },
    { href: '/about', label: t.nav.about, Icon: Info },
    { href: '/pricing', label: t.nav.pricing, Icon: Gem },
  ];
  const isActive = (href: string, exact?: boolean) =>
    href === '/' || exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className={cn('fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden', open ? 'block' : 'hidden')}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        className={cn(
          'app-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col px-3 py-4 transition-transform duration-300 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Signature multicolor brandstrip */}
        <div className="mb-4 flex h-[3px] overflow-hidden rounded-full">
          <i className="flex-1" style={{ background: '#e4002b' }} />
          <i className="flex-1" style={{ background: '#6a1fe0' }} />
          <i className="flex-1" style={{ background: '#2e5bff' }} />
          <i className="flex-1" style={{ background: '#00c2a3' }} />
          <i className="flex-1" style={{ background: '#c7f000' }} />
        </div>

        {/* Brand (белый вордмарк — sidebar всегда тёмный) */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="mb-6 flex items-center gap-2.5 px-2 transition-transform hover:scale-[1.02]"
        >
          <BrandMark size={34} className="shrink-0 drop-shadow-[0_0_10px_rgb(var(--accent)/0.45)]" />
          <span className="text-xl font-extrabold lowercase tracking-tight">
            <span style={{ color: '#fff' }}>betanalyse</span>
            <span style={{ color: 'rgb(var(--accent))' }}>.pro</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'side-link flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px]',
                  active && 'active',
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
