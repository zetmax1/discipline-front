export const MAX_DISTRACTIONS = 100;

/** Local (demo mode) equivalent of the server's clamped increment. */
export function applyDistractionDelta(current: number, delta: 1 | -1): number {
  return Math.min(MAX_DISTRACTIONS, Math.max(0, current + delta));
}
