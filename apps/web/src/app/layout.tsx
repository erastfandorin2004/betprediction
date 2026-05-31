import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AI-Score — Умный компаньон болельщика',
    template: '%s | AI-Score',
  },
  description:
    'Live-матчи, глубокая статистика и AI-прогнозы из ансамбля LLM с публичным трек-рекордом точности.',
  keywords: ['футбол', 'прогнозы', 'ставки', 'статистика', 'AI', 'live'],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#040812',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-pitch-950">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-pitch-800 bg-pitch-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-2 font-bold">
            <span className="text-xl">⚡</span>
            <span className="text-gradient-electric text-lg">AI-Score</span>
          </a>
          <nav className="hidden gap-6 md:flex">
            {[
              ['Матчи', '/matches'],
              ['AI-выборы', '/picks'],
              ['Value-беты', '/value'],
              ['Трек-рекорд', '/track-record'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Войти
          </a>
          <a
            href="/register"
            className="electric-glow rounded-lg bg-electric-600 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-electric-500"
          >
            Попробовать
          </a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-pitch-800 py-8 text-center text-xs text-zinc-600">
      <p>
        AI-Score предоставляет аналитическую информацию исключительно в образовательных целях.
        Прогнозы не являются гарантией результата. 18+. Играй ответственно.
      </p>
      <p className="mt-2">© 2025 AI-Score. Все права защищены.</p>
    </footer>
  );
}
