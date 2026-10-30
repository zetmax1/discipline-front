// Display helpers: a missing value is "—", never 0.
const DASH = '—';

export function formatScore(score: number | null | undefined): string {
  return score == null ? DASH : String(score);
}

export function formatPercent(ratio: number | null | undefined): string {
  return ratio == null ? DASH : `${Math.round(ratio * 100)}%`;
}

export function formatHours(minutes: number): string {
  return `${Math.round((minutes / 60) * 10) / 10}h`;
}

/** "Log N more days" when patterns need more data, otherwise null. */
export function patternsMessage(p: { insufficient_data: boolean; days_needed?: number }): string | null {
  if (!p.insufficient_data) return null;
  const n = p.days_needed ?? 0;
  return `Log ${n} more ${n === 1 ? 'day' : 'days'} to see patterns.`;
}
