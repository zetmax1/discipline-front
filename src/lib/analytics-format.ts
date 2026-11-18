import { formatNumber, translate, weekdayName } from '@/i18n/translate';
import type { Locale } from '@/i18n/locales';

// Display helpers: a missing value is "—", never 0. Numbers are formatted for `locale`.
const DASH = '—';

export function formatScore(score: number | null | undefined): string {
  return score == null ? DASH : String(score);
}

export function formatPercent(ratio: number | null | undefined, locale: Locale = 'en'): string {
  return ratio == null ? DASH : formatNumber(locale, Math.round(ratio * 100) / 100, { style: 'percent' });
}

export function formatHours(minutes: number, locale: Locale = 'en'): string {
  return translate(locale, 'common.hours', { n: formatNumber(locale, minutes / 60, { maximumFractionDigits: 1 }) });
}

/** "Log N more days" when patterns need more data, otherwise null. */
export function patternsMessage(p: { insufficient_data: boolean; days_needed?: number }, locale: Locale = 'en'): string | null {
  if (!p.insufficient_data) return null;
  return translate(locale, 'analytics.needMoreDays', { count: p.days_needed ?? 0 });
}

interface FoundPatterns {
  best_weekday?: string | null;
  peak_hour?: number | null;
  trend: 'improving' | 'stable' | 'declining';
  consistency_score: number;
  insights: string[];
}

/** Pattern lines: the analytics service's English text, or the same facts in `locale`. */
export function patternInsights(p: FoundPatterns, locale: Locale = 'en'): string[] {
  if (locale === 'en') return p.insights;
  const lines: string[] = [];
  if (p.best_weekday) lines.push(translate(locale, 'analytics.insight.bestDay', { day: weekdayName(locale, p.best_weekday) }));
  if (p.peak_hour != null) {
    lines.push(translate(locale, 'analytics.insight.peakHour', { time: `${String(p.peak_hour).padStart(2, '0')}:00` }));
  }
  lines.push(translate(locale, `analytics.insight.trend.${p.trend}`));
  lines.push(translate(locale, 'analytics.insight.consistency', { score: p.consistency_score }));
  return lines;
}
