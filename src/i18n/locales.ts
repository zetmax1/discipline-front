/** UI languages. Uzbek (Latin) is the default once F12A is on. */
export const LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'uz';

/** BCP 47 tags for Intl (dates, numbers, plural rules). */
export const INTL_LOCALE: Record<Locale, string> = { uz: 'uz-Latn', ru: 'ru', en: 'en' };

/** Each language's name in that language (shown in the switcher, never translated). */
export const LOCALE_NAMES: Record<Locale, string> = { uz: 'Oʻzbekcha', ru: 'Русский', en: 'English' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
