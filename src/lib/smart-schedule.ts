const CATEGORY_NAMES: Record<string, string> = { 'deep-work': 'Deep Work', study: 'Study', rest: 'Rest' };

/** One line per category the generator could not fully place. */
export function shortfallMessages(shortfall: Record<string, number>): string[] {
  return Object.entries(shortfall)
    .filter(([, minutes]) => minutes > 0)
    .map(([category, minutes]) => `Could not fit ${Math.round((minutes / 60) * 10) / 10} h of ${CATEGORY_NAMES[category] ?? category}.`);
}
