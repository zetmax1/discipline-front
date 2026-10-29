const CATEGORY_NAMES: Record<string, string> = { 'deep-work': 'Deep Work', study: 'Study', rest: 'Rest' };

/** One line per category the generator could not fully place. */
export function shortfallMessages(shortfall: Record<string, number>): string[] {
  return Object.entries(shortfall)
    .filter(([, minutes]) => minutes > 0)
    .map(([category, minutes]) => `Could not fit ${Math.round((minutes / 60) * 10) / 10} h of ${CATEGORY_NAMES[category] ?? category}.`);
}

export const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAYS = ALL_DAYS.slice(0, 5);

const short = (day: string) => day.slice(0, 3);

/** Adds or removes `day`, keeping week order. */
export function toggleDay(days: string[], day: string): string[] {
  const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
  return ALL_DAYS.filter(d => next.includes(d));
}

/** "Every day", "Mon–Fri", "Sat–Sun", or e.g. "Mon, Wed, Fri". */
export function formatDays(days: string[]): string {
  const ordered = ALL_DAYS.filter(d => days.includes(d));
  if (ordered.length === 0) return 'No days';
  if (ordered.length === 7) return 'Every day';
  if (ordered.join() === WEEKDAYS.join()) return 'Mon–Fri';
  if (ordered.join() === 'Saturday,Sunday') return 'Sat–Sun';
  return ordered.map(short).join(', ');
}
