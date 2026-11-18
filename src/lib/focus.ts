import type { TKey } from '@/i18n/translate';

/** Focus/break presets in minutes; a long break follows every 4th completed session. */
export interface Preset { focus: number; break: number; longBreak: number }
export const PRESETS: Preset[] = [
  { focus: 25, break: 5, longBreak: 15 },
  { focus: 50, break: 10, longBreak: 20 },
  { focus: 90, break: 20, longBreak: 30 },
];
export const CUSTOM_MIN = 10;
export const CUSTOM_MAX = 180;
export const SESSIONS_PER_LONG_BREAK = 4;

/** The break after the `completedToday`-th completed session of the day. */
export function breakFor(p: Preset, completedToday: number): number {
  return completedToday > 0 && completedToday % SESSIONS_PER_LONG_BREAK === 0 ? p.longBreak : p.break;
}

/** A preset for a custom length: break ≈ 1/5, long break ≈ 1/2 (rounded, at least 5 / 15 minutes). */
export function customPreset(focus: number): Preset {
  return { focus, break: Math.max(5, Math.round(focus / 5)), longBreak: Math.max(15, Math.round(focus / 2)) };
}

/** serverNow − this device's clock when the response arrived: add it to Date.now() to get server time. */
export function clockOffset(serverNowMs: number, receivedAtMs: number): number {
  return serverNowMs - receivedAtMs;
}

/** Whole seconds left: plannedMinutes − (server time now − startedAt), never below 0. Same on every device. */
export function remainingSeconds(s: { startedAt: string; plannedMinutes: number }, deviceNowMs: number, offsetMs: number): number {
  const elapsed = deviceNowMs + offsetMs - Date.parse(s.startedAt);
  return Math.max(0, Math.floor((s.plannedMinutes * 60_000 - elapsed) / 1000));
}

export function formatCountdown(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

const SUGGESTIONS: TKey[] = ['breaks.walk', 'breaks.water', 'breaks.stretch', 'breaks.eyes'];

/** Break suggestions rotate (walk, water, stretch, eye rest). */
export function breakSuggestion(n: number): TKey {
  return SUGGESTIONS[((n % SUGGESTIONS.length) + SUGGESTIONS.length) % SUGGESTIONS.length];
}
