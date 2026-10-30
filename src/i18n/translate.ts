import { en } from './en';
import { uz } from './uz';
import { ru } from './ru';
import { INTL_LOCALE, type Locale } from './locales';

type EnKey = keyof typeof en;
type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
type PluralKey = Extract<EnKey, `${string}_${PluralCategory}`>;
type PlainKey = Exclude<EnKey, PluralKey>;
type BaseOf<K> = K extends `${infer B}_${PluralCategory}` ? B : never;
type PluralBase = BaseOf<PluralKey>;

/** A key t() accepts: a plain key, or a plural base (`planner.blocks`) used with `{ count }`. */
export type TKey = PlainKey | PluralBase;
export type Params = Record<string, string | number>;
/** A message to translate later (lib code returns these instead of English text). */
export type Msg = { key: TKey; params?: Params };

/** What uz and ru must provide: every plain key, plus the plural forms their language uses. */
export type Messages = { [K in PlainKey]: string } & { [K in `${PluralBase}_${PluralCategory}`]?: string };

const DICTIONARIES: Record<Locale, Record<string, string | undefined>> = { en, uz, ru };

function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** Translates `key` into `locale`; plural keys pick their form from `params.count`. Missing text falls back to English. */
export function translate(locale: Locale, key: TKey, params?: Params): string {
  const dict = DICTIONARIES[locale];
  if (params && typeof params.count === 'number' && !(key in en)) {
    const category = new Intl.PluralRules(INTL_LOCALE[locale]).select(params.count);
    const text = dict[`${key}_${category}`] ?? dict[`${key}_other`] ?? en[`${key}_other` as EnKey];
    return fill(text ?? key, params);
  }
  return fill(dict[key] ?? en[key as EnKey] ?? key, params);
}

export function formatDate(locale: Locale, date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], options).format(date);
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], options).format(value);
}

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** The local name of an English weekday name ("Monday" → "dushanba"); unknown names pass through. */
export function weekdayName(locale: Locale, englishDay: string, width: 'long' | 'short' = 'long'): string {
  const i = WEEK.indexOf(englishDay);
  if (i === -1) return englishDay;
  return formatDate(locale, new Date(2024, 0, 1 + i), { weekday: width }); // 2024-01-01 was a Monday
}
