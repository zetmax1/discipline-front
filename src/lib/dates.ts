import { addDays, format } from 'date-fns';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The local calendar date of `date` as yyyy-MM-dd (never the UTC date). */
export function localDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/** The next local date (starting tomorrow) that falls on `dayName`, e.g. "Monday". */
export function weeklyPlanDate(dayName: string, from: Date = new Date()): string {
  const target = WEEKDAYS.indexOf(dayName);
  if (target === -1) throw new Error(`Unknown day: ${dayName}`);
  let date = addDays(from, 1);
  while (date.getDay() !== target) date = addDays(date, 1);
  return localDateString(date);
}
