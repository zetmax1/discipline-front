import { addDays, addWeeks, format, startOfWeek } from 'date-fns';
import { formatDate, translate } from '@/i18n/translate';
import type { Locale } from '@/i18n/locales';

const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** The local calendar date of `date` as yyyy-MM-dd (never the UTC date). */
export function localDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/** Date and clock parts of `at` in an IANA zone; null when the zone is missing or unknown. */
function zonedParts(at: Date, timeZone?: string) {
  if (!timeZone) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(at);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    return { date: `${get('year')}-${get('month')}-${get('day')}`, minute: Number(get('hour')) * 60 + Number(get('minute')) };
  } catch {
    return null; // RangeError: unknown zone
  }
}

/** The calendar date of `at` in the user's IANA zone (VISION time rules); the device's when unknown. */
export function zonedDateString(at: Date, timeZone?: string): string {
  return zonedParts(at, timeZone)?.date ?? localDateString(at);
}

/** Minutes since midnight of `at` in the user's IANA zone; the device's when unknown. */
export function zonedMinuteOfDay(at: Date, timeZone?: string): number {
  return zonedParts(at, timeZone)?.minute ?? at.getHours() * 60 + at.getMinutes();
}

export interface WeekOption {
  weekStart: string; // Monday, yyyy-MM-dd
  label: string;
  isDefault: boolean;
}

/** This week and the next four (Mon–Sun, local time); next week is the default. Labels are in `locale`. */
export function weekOptions(from: Date = new Date(), count = 5, locale: Locale = 'en'): WeekOption[] {
  const thisMonday = startOfWeek(from, { weekStartsOn: 1 });
  const day = (d: Date) => formatDate(locale, d, { month: 'short', day: 'numeric' });
  return Array.from({ length: count }, (_, i) => {
    const monday = addWeeks(thisMonday, i);
    const range = `${day(monday)} – ${day(addDays(monday, 6))}`;
    const label = i === 0 ? translate(locale, 'schedule.thisWeek', { range })
      : i === 1 ? translate(locale, 'schedule.nextWeek', { range }) : range;
    return { weekStart: localDateString(monday), label, isDefault: i === 1 };
  });
}

/** The date of `dayName` (e.g. "Sunday") in the Mon–Sun week starting at `weekStart`. */
export function planDateFor(dayName: string, weekStart: string): string {
  const index = WEEK_ORDER.indexOf(dayName);
  if (index === -1) throw new Error(`Unknown day: ${dayName}`);
  const [y, m, d] = weekStart.split('-').map(Number);
  return localDateString(addDays(new Date(y, m - 1, d), index));
}
