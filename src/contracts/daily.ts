/**
 * Contract for the daily loop (F1): morning check-in, focus sessions, evening shutdown.
 * `contracts/daily.schema.json` is the exported JSON Schema; the API's Go tests validate their
 * responses against it. After changing a schema, run `npm run contract:update`.
 */
import { z } from 'zod/v4';

const minuteOfDay = z.number().int().min(0).max(1440);
const rating = z.number().int().min(1).max(5);

/** Sleep start > end means it began the evening before. sleepMinutes is real elapsed time (DST-aware). */
export const MorningCheckin = z.looseObject({
  date: z.string(),
  skipped: z.boolean(),
  sleepStartMin: minuteOfDay.nullable(),
  sleepEndMin: minuteOfDay.nullable(),
  sleepMinutes: z.number().int().nullable(),
  sleepQuality: rating.nullable(),
  energy: rating.nullable(),
  note: z.string().nullable(),
});
export type MorningCheckin = z.infer<typeof MorningCheckin>;

export const CheckinResponse = z.looseObject({ checkin: MorningCheckin });
export const CheckinToday = z.looseObject({
  date: z.string(),
  checkin: MorningCheckin.nullable(),
  defaults: z.looseObject({ sleepStartMin: minuteOfDay, sleepEndMin: minuteOfDay }),
});
export type CheckinToday = z.infer<typeof CheckinToday>;

export const SESSION_OUTCOMES = ['completed', 'abandoned'] as const;

/** A focus session. Remaining time = plannedMinutes − (serverNow − startedAt): the same on every device. */
export const FocusSession = z.looseObject({
  id: z.string(),
  blockId: z.number().nullable(),
  startedAt: z.string(), // RFC 3339, UTC
  plannedMinutes: z.number().int().min(10).max(180),
  breakMinutes: z.number().int().min(0).max(60),
  endedAt: z.string().nullable(),
  outcome: z.enum(SESSION_OUTCOMES).nullable(),
  distractions: z.number().int().min(0),
});
export type FocusSession = z.infer<typeof FocusSession>;

export const SessionResponse = z.looseObject({ session: FocusSession.nullable(), serverNow: z.string() });
export type SessionResponse = z.infer<typeof SessionResponse>;
export const SessionList = z.looseObject({ sessions: z.array(FocusSession), serverNow: z.string() });
export type SessionList = z.infer<typeof SessionList>;

/** An evening shutdown: the local day is closed (with one win). */
export const Shutdown = z.looseObject({ date: z.string(), win: z.string().nullable(), closedAt: z.string() });
export type Shutdown = z.infer<typeof Shutdown>;
export const ShutdownResponse = z.looseObject({ shutdown: Shutdown });
export const ShutdownToday = z.looseObject({ date: z.string(), shutdown: Shutdown.nullable() });
export type ShutdownToday = z.infer<typeof ShutdownToday>;

export function exportContract() {
  return {
    shutdown: z.toJSONSchema(Shutdown),
    shutdown_response: z.toJSONSchema(ShutdownResponse),
    shutdown_today: z.toJSONSchema(ShutdownToday),
    session: z.toJSONSchema(FocusSession),
    session_response: z.toJSONSchema(SessionResponse),
    session_list: z.toJSONSchema(SessionList),
    checkin: z.toJSONSchema(MorningCheckin),
    checkin_response: z.toJSONSchema(CheckinResponse),
    checkin_today: z.toJSONSchema(CheckinToday),
  };
}
