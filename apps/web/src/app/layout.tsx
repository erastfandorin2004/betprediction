import type { Metadata, Viewport } from 'next';
import { Manrope, JetBrains_Mono, Montserrat, Noto_Sans } from 'next/font/google';
import { AuthProvider } from '@/components/auth/auth-provider';
import { AuthHeader } from '@/components/auth/auth-header';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { LocaleProvider } from '@/components/i18n/locale-provider';
import { Footer } from '@/components/layout/footer';
import './globals.css';

const sans = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

// World Cup 2026 light theme typography: Montserrat (display) + Noto Sans (body).
// Applied only under .light (see globals.css) — dark theme keeps Manrope.
const display = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

const body = Noto_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'betanalyse.pro — Smart Football Companion',
    template: '%s | betanalyse.pro',
  },
  description: 'Live matches, deep statistics and AI predictions with a public accuracy track record.',
  keywords: ['football', 'predictions', 'betting', 'statistics', 'AI', 'live'],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={`light ${sans.variable} ${jetbrainsMono.variable} ${display.variable} ${body.variable}`}>
      <body className="min-h-screen bg-pitch-950">
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <div className="flex min-h-screen flex-col">
                <AuthHeader />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
