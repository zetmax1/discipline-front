import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFeature } from '@/hooks/use-features';
import { I18nContext, makeI18n } from './context';
import { DEFAULT_LOCALE, isLocale, type Locale } from './locales';

const STORAGE_KEY = 'locale';

function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

/** Language for the whole app: English while F12A is off; otherwise the saved choice or Uzbek. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const enabled = useFeature('F12A');
  const [chosen, setChosen] = useState<Locale>(() => readStoredLocale() ?? DEFAULT_LOCALE);
  const locale = enabled ? chosen : 'en';

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setChosen(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
  }, []);

  const value = useMemo(() => makeI18n(locale, enabled, setLocale), [locale, enabled, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
