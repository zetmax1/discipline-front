/**
 * Contract for the analytics responses the UI reads (Python → Gin → React).
 *
 * The UI parses responses with these schemas and derives its types from them.
 * `contracts/analytics.schema.json` is the exported JSON Schema; the analytics
 * service's test suite validates its real responses against that file.
 * After changing a schema, run `npm run contract:update`.
 *
 * Objects are "loose": the server may add fields, but every field listed here
 * must be present with this type.
 */
import { z } from 'zod/v4';

const nullableNumber = z.number().nullable();

export const DayMetrics = z.looseObject({
  date: z.string(),
  planned_minutes: z.number(),
  completed_minutes: z.number(),
  due_planned_minutes: z.number(),
  due_completed_minutes: z.number(),
  deep_work_minutes: z.number(),
  distractions: z.number(),
  completion: nullableNumber, // null = nothing due
  deep: z.number(),
  distraction: z.number(),
  focus_score: nullableNumber, // null = nothing due; show "—", never 0
});

export const TodayResponse = DayMetrics.extend({
  daily_deep_work_target_minutes: z.number(),
});

const SeriesPoint = z.looseObject({ label: z.string(), value: nullableNumber });

const HeatmapData = z.looseObject({
  weekdays: z.array(z.string()),
  hours: z.array(z.number()),
  values: z.array(z.array(z.number())),
});

const chart = <T extends z.ZodType>(data: T) => z.looseObject({ image: z.string(), data });

export const InsufficientData = z.looseObject({
  insufficient_data: z.literal(true),
  days_needed: z.number(),
});

export const Patterns = z.looseObject({
  insufficient_data: z.literal(false),
  days_with_data: z.number(),
  window_days: z.number(),
  best_weekday: z.string().nullable(),
  peak_hour: nullableNumber,
  trend: z.enum(['improving', 'stable', 'declining']),
  consistency_score: z.number(),
  insights: z.array(z.string()),
});

export const PeriodReport = z.looseObject({
  range: z.enum(['week', 'month']),
  start_date: z.string(),
  end_date: z.string(),
  period_end_date: z.string(),
  focus_score: nullableNumber,
  planned_minutes: z.number(),
  completed_minutes: z.number(),
  deep_work_minutes: z.number(),
  streak: z.number(),
  days: z.array(DayMetrics),
  category_minutes: z.array(z.looseObject({ category: z.string(), minutes: z.number() })),
  comparison: z.looseObject({ previous_focus_score: nullableNumber, change: nullableNumber }),
  patterns: z.discriminatedUnion('insufficient_data', [InsufficientData, Patterns]),
  charts: z.looseObject({
    focus_gauge: chart(z.looseObject({ score: nullableNumber })),
    category_distribution: chart(z.array(SeriesPoint)),
  }),
});

export const FocusPatternsResponse = z.looseObject({
  start_date: z.string(),
  end_date: z.string(),
  days: z.number(),
  heatmap: HeatmapData,
  productivity_by_weekday: z.array(z.looseObject({ day: z.string(), focus_score: nullableNumber })),
  deep_work_by_slot: z.array(z.looseObject({ label: z.string(), minutes: z.number() })),
  distraction_trend: z.array(z.looseObject({ date: z.string(), distractions_per_hour: nullableNumber })),
  charts: z.looseObject({
    focus_heatmap: chart(HeatmapData),
    distraction_trend: chart(z.array(SeriesPoint)),
  }),
});

export const ScheduleBlock = z.looseObject({
  id: z.string(),
  name: z.string(),
  category: z.string(), // 'fixed' | 'deep-work' | 'study' | 'rest'
  startTime: z.string(),
  endTime: z.string(),
  day: z.string(),
});

export const SmartScheduleResponse = z.looseObject({
  blocks: z.array(ScheduleBlock),
  reasoning: z.array(z.string()),
  placed_minutes: z.record(z.string(), z.number()),
  shortfall_minutes: z.record(z.string(), z.number()), // per category; > 0 = could not fit
});

export type DayMetrics = z.infer<typeof DayMetrics>;
export type SmartScheduleResponse = z.infer<typeof SmartScheduleResponse>;
export type TodayResponse = z.infer<typeof TodayResponse>;
export type PeriodReport = z.infer<typeof PeriodReport>;
export type FocusPatternsResponse = z.infer<typeof FocusPatternsResponse>;
export type PatternsResult = PeriodReport['patterns'];
export type PatternsFound = z.infer<typeof Patterns>;

/** JSON Schemas keyed by response, written to contracts/analytics.schema.json. */
export function exportContract() {
  return {
    today: z.toJSONSchema(TodayResponse),
    period_report: z.toJSONSchema(PeriodReport),
    focus_patterns: z.toJSONSchema(FocusPatternsResponse),
    smart_schedule: z.toJSONSchema(SmartScheduleResponse),
  };
}
