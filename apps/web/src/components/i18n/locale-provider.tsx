'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations, type Locale } from '@/lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: typeof translations.ru;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'ru',
  setLocale: () => {},
  t: translations.ru,
});

function writeLocaleCookie(l: Locale) {
  // 1 year; readable by the server component that fetches localised news
  document.cookie = `ai-score-locale=${l}; path=/; max-age=31536000; samesite=lax`;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ru');

  useEffect(() => {
    const stored = localStorage.getItem('ai-score-locale') as Locale | null;
    if (stored === 'ru' || stored === 'en') {
      setLocaleState(stored);
      writeLocaleCookie(stored);
    } else {
      // First visit — persist the default so the server (news, etc.) agrees
      writeLocaleCookie('ru');
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem('ai-score-locale', l);
    writeLocaleCookie(l);
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
