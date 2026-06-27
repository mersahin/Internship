'use client';

import { createContext, useContext } from 'react';
import type { Locale } from './config';
import type { Dictionary } from './dictionaries';

const LocaleContext = createContext<{ locale: Locale; t: Dictionary } | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={{ locale, t: dict }}>{children}</LocaleContext.Provider>;
}

function useLocaleContext() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useT/useLocale must be used within LocaleProvider');
  return ctx;
}

// Client-side translation hook — returns the active dictionary.
export function useT(): Dictionary {
  return useLocaleContext().t;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}
