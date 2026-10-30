// Minimal valid analytics payloads for UI tests.
export const day = (date: string, over: Record<string, unknown> = {}) => ({
  date, planned_minutes: 0, completed_minutes: 0, due_planned_minutes: 0, due_completed_minutes: 0,
  deep_work_minutes: 0, distractions: 0, blocks_total: 0, blocks_due: 0, blocks_completed: 0,
  completion: null, deep: 0, distraction: 0, focus_score: null, ...over,
});

const chart = (data: unknown) => ({ image: 'iVBORw0KGgo=', data });

export const periodReport = (over: Record<string, unknown> = {}) => ({
  range: 'week', start_date: '2026-10-26', end_date: '2026-10-29', period_end_date: '2026-11-01',
  focus_score: null, planned_minutes: 0, completed_minutes: 0, deep_work_minutes: 0, streak: 0,
  days: [day('2026-10-26'), day('2026-10-27')], category_minutes: [],
  comparison: { previous_focus_score: null, change: null },
  patterns: { insufficient_data: true, days_needed: 4, days_with_data: 3, window_days: 30 },
  charts: { focus_gauge: chart({ score: null }), category_distribution: chart([]) },
  ...over,
});

export const focusPatterns = () => ({
  start_date: '2026-10-23', end_date: '2026-10-29', days: 7,
  heatmap: { weekdays: ['Mon'], hours: [0], values: [[0]] },
  productivity_by_weekday: [{ day: 'Mon', focus_score: null }],
  deep_work_by_slot: [{ label: 'Morning (6–12)', minutes: 0 }],
  distraction_trend: [{ date: '2026-10-29', distractions_per_hour: null }],
  charts: {
    focus_heatmap: chart({ weekdays: ['Mon'], hours: [0], values: [[0]] }),
    distraction_trend: chart([{ label: '2026-10-29', value: null }]),
  },
});

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
