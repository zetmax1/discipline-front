import { createContext, useContext } from 'react';
import { ApiError } from '@/lib/api';
import { en } from './en';
import type { Locale } from './locales';
import { formatDate, formatNumber, translate, weekdayName, type Msg, type Params, type TKey } from './translate';

export type { Msg, TKey, Params } from './translate';
export type { Locale } from './locales';

export interface I18n {
  locale: Locale;
  /** True when F12A is on: show the language switcher. */
  switchable: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: TKey | Msg, params?: Params) => string;
  formatDate: (date: Date, options: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  weekday: (englishDay: string, width?: 'long' | 'short') => string;
  /** The text to show for a caught error: the API code's translation, else the server's text, else `fallback`. */
  errorMessage: (err: unknown, fallback: TKey) => string;
}

export function makeI18n(locale: Locale, switchable: boolean, setLocale: (l: Locale) => void): I18n {
  const t: I18n['t'] = (key, params) =>
    typeof key === 'string' ? translate(locale, key, params) : translate(locale, key.key, key.params);
  return {
    locale,
    switchable,
    setLocale,
    t,
    formatDate: (date, options) => formatDate(locale, date, options),
    formatNumber: (value, options) => formatNumber(locale, value, options),
    weekday: (day, width) => weekdayName(locale, day, width),
    errorMessage: (err, fallback) => {
      if (err instanceof ApiError) {
        const key = `errors.${String(err.body.code)}`;
        if (key in en) return t(key as TKey);
        const text = err.body.error; // an older server without codes: its own text
        return typeof text === 'string' && text ? text : t(fallback);
      }
      if (err instanceof TypeError) return t('errors.network'); // fetch() could not reach the server
      if (err instanceof Error && err.message) return err.message;
      return t(fallback);
    },
  };
}

// Without a provider (unit tests of single components) the UI is English, as before F12a.
export const I18nContext = createContext<I18n>(makeI18n('en', false, () => {}));

export function useI18n(): I18n {
  return useContext(I18nContext);
}
