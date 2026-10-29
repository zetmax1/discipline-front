import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportContract, PeriodReport, TodayResponse, FocusPatternsResponse } from './analytics';

const CONTRACT_FILE = join(__dirname, '..', '..', 'contracts', 'analytics.schema.json');

describe('analytics contract file', () => {
  it('matches the zod schemas the UI parses with (run `npm run contract:update` after changing them)', () => {
    const fresh = JSON.stringify(exportContract(), null, 2) + '\n';
    if (process.env.UPDATE_CONTRACT === '1') writeFileSync(CONTRACT_FILE, fresh);
    expect(existsSync(CONTRACT_FILE)).toBe(true);
    expect(readFileSync(CONTRACT_FILE, 'utf8')).toBe(fresh);
  });

  it('covers every analytics response the frontend reads', () => {
    expect(Object.keys(exportContract()).sort()).toEqual(['focus_patterns', 'period_report', 'today']);
  });
});

const day = {
  date: '2026-10-29', planned_minutes: 240, completed_minutes: 120, due_planned_minutes: 60,
  due_completed_minutes: 60, deep_work_minutes: 120, distractions: 1, blocks_total: 3, blocks_due: 1,
  blocks_completed: 2, completion: 1, deep: 0.667, distraction: 0.875, focus_score: 88,
};
const chart = (data: unknown) => ({ image: 'iVBOR', data });

describe('schemas', () => {
  it('accept a null score (nothing due) and extra fields from the server', () => {
    expect(TodayResponse.parse({ ...day, completion: null, focus_score: null, daily_deep_work_target_minutes: 180, extra: 1 }).focus_score).toBeNull();
  });

  it('reject a response missing a field the UI reads', () => {
    const { focus_score: _drop, ...rest } = day;
    expect(TodayResponse.safeParse({ ...rest, daily_deep_work_target_minutes: 180 }).success).toBe(false);
  });

  it('parse both pattern shapes', () => {
    const base = {
      range: 'week', start_date: '2026-10-26', end_date: '2026-10-29', period_end_date: '2026-11-01',
      focus_score: null, planned_minutes: 0, completed_minutes: 0, deep_work_minutes: 0, days: [day],
      category_minutes: [], streak: 0, comparison: { previous_focus_score: null, change: null },
      charts: { focus_gauge: chart({ score: null }), category_distribution: chart([]) },
    };
    const insufficient = PeriodReport.parse({ ...base, patterns: { insufficient_data: true, days_needed: 4, days_with_data: 3, window_days: 30 } });
    expect(insufficient.patterns.insufficient_data).toBe(true);
    const full = PeriodReport.parse({ ...base, patterns: {
      insufficient_data: false, days_with_data: 9, window_days: 30, best_weekday: 'Monday', peak_hour: 9,
      trend: 'stable', consistency_score: 80, insights: ['x'],
    } });
    expect(full.patterns.insufficient_data).toBe(false);
  });

  it('parse focus patterns with chart data next to images', () => {
    const fp = FocusPatternsResponse.parse({
      start_date: '2026-09-30', end_date: '2026-10-29', days: 30,
      heatmap: { weekdays: ['Mon'], hours: [0], values: [[0]] },
      productivity_by_weekday: [{ day: 'Mon', focus_score: null }],
      deep_work_by_slot: [{ label: 'Morning', minutes: 0 }],
      distraction_trend: [{ date: '2026-10-29', distractions_per_hour: null }],
      charts: {
        focus_heatmap: chart({ weekdays: ['Mon'], hours: [0], values: [[0]] }),
        distraction_trend: chart([{ label: '2026-10-29', value: null }]),
      },
    });
    expect(fp.charts.focus_heatmap.data.hours).toEqual([0]);
  });
});
