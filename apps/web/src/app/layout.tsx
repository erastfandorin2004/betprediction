import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/components/auth/auth-provider';
import { AuthHeader } from '@/components/auth/auth-header';
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
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <AuthHeader />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
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
