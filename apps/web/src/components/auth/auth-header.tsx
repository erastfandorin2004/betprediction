'use client';

import Link from 'next/link';
import { useAuth } from './auth-provider';
import { logout } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Матчи' },
  { href: '/track-record', label: 'Трек-рекорд' },
];

export function AuthHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ai-score-access') : null;
    if (token) await logout(token);
    signOut();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-pitch-800 bg-pitch-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="text-xl">⚡</span>
            <span className="text-gradient-electric text-lg">AI-Score</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={
                  pathname === href
                    ? 'text-sm text-zinc-100'
                    : 'text-sm text-zinc-400 transition-colors hover:text-zinc-100'
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-zinc-500 md:block">{user.email}</span>
              <button
                onClick={() => { void handleLogout(); }}
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">
                Войти
              </Link>
              <Link
                href="/register"
                className="electric-glow rounded-lg bg-electric-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-electric-500"
              >
                Попробовать
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
