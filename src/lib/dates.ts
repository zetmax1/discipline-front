import { addDays, addWeeks, format, startOfWeek } from 'date-fns';

const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** The local calendar date of `date` as yyyy-MM-dd (never the UTC date). */
export function localDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export interface WeekOption {
  weekStart: string; // Monday, yyyy-MM-dd
  label: string;
  isDefault: boolean;
}

/** This week and the next four (Mon–Sun, local time); next week is the default. */
export function weekOptions(from: Date = new Date(), count = 5): WeekOption[] {
  const thisMonday = startOfWeek(from, { weekStartsOn: 1 });
  return Array.from({ length: count }, (_, i) => {
    const monday = addWeeks(thisMonday, i);
    const range = `${format(monday, 'MMM d')} – ${format(addDays(monday, 6), 'MMM d')}`;
    const label = i === 0 ? `This week (${range})` : i === 1 ? `Next week (${range})` : range;
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
