import { formatNumber, translate, weekdayName, type TKey } from '@/i18n/translate';
import { en } from '@/i18n/en';
import type { Locale } from '@/i18n/locales';

/** The translated name of a block category ("deep-work" → "Deep Work"); unknown ones pass through. */
export function categoryLabel(category: string, locale: Locale = 'en'): string {
  const key = `categories.${category}`;
  return key in en ? translate(locale, key as TKey) : category;
}

/** One line per category the generator could not fully place. */
export function shortfallMessages(shortfall: Record<string, number>, locale: Locale = 'en'): string[] {
  return Object.entries(shortfall)
    .filter(([, minutes]) => minutes > 0)
    .map(([category, minutes]) => translate(locale, 'schedule.shortfall', {
      hours: formatNumber(locale, minutes / 60, { maximumFractionDigits: 1 }),
      category: categoryLabel(category, locale),
    }));
}

export const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAYS = ALL_DAYS.slice(0, 5);


/** Adds or removes `day`, keeping week order. */
export function toggleDay(days: string[], day: string): string[] {
  const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
  return ALL_DAYS.filter(d => next.includes(d));
}

/** "Every day", "Mon–Fri", "Sat–Sun", or e.g. "Mon, Wed, Fri" (weekday names in `locale`). */
export function formatDays(days: string[], locale: Locale = 'en'): string {
  const short = (day: string) => weekdayName(locale, day, 'short');
  const ordered = ALL_DAYS.filter(d => days.includes(d));
  if (ordered.length === 0) return translate(locale, 'schedule.days.none');
  if (ordered.length === 7) return translate(locale, 'schedule.days.every');
  if (ordered.join() === WEEKDAYS.join()) return `${short('Monday')}–${short('Friday')}`;
  if (ordered.join() === 'Saturday,Sunday') return `${short('Saturday')}–${short('Sunday')}`;
  return ordered.map(short).join(', ');
}
