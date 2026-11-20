/**
 * Data on this device that belongs to the signed-in account: the planner caches (`planner-*`)
 * and the offline sync queue. Another account on the same device must never see it, and must
 * never replay the previous account's queued writes (F13 review H4).
 */
export const SYNC_QUEUE_KEY = 'sync-queue';
export const PLANNER_CACHE_PREFIX = 'planner-';
const OWNER_KEY = 'device-data-owner';

/** Removes the account's cached data and queued writes; device settings (language, theme) stay. */
export function clearAccountData(): void {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PLANNER_CACHE_PREFIX) || k === SYNC_QUEUE_KEY || k === OWNER_KEY)
      .forEach(k => localStorage.removeItem(k));
  } catch {
    // Storage blocked: nothing was stored either.
  }
}

/** Called when an account signs in: data left by a different account is removed first. */
export function claimAccountData(userId: number): void {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner !== null && owner !== String(userId)) clearAccountData();
    localStorage.setItem(OWNER_KEY, String(userId));
  } catch {
    // Storage blocked: nothing to protect.
  }
}
