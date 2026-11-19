import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveCheckin } from './daily-api';
import { pending } from './sync-queue';

/**
 * A morning check-in saved offline carries the moment the user saved it (madeAt), so the server
 * counts it for that local day even when the queue only drains after midnight. The server bounds
 * the value (at most 24 h old, at most a minute ahead) and falls back to today.
 */
describe('saveCheckin', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stamps the check-in with the moment it was made, also when it is queued offline', async () => {
    vi.setSystemTime(new Date('2026-10-29T18:58:00Z')); // 23:58 in Asia/Tashkent
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));

    const res = await saveCheckin({ sleepStartMin: 1410, sleepEndMin: 420, sleepQuality: 4, energy: 3 });
    expect(res).toEqual({ queued: true });

    const queued = pending()[0];
    expect(queued.key).toBe('checkin:today');
    expect((queued.body as { madeAt: string }).madeAt).toBe('2026-10-29T18:58:00.000Z');

    // The queue replays it later; the stamp stays the moment the user saved it.
    vi.setSystemTime(new Date('2026-10-29T19:05:00Z'));
    expect((pending()[0].body as { madeAt: string }).madeAt).toBe('2026-10-29T18:58:00.000Z');
  });

  it('stamps a skipped check-in too', async () => {
    vi.setSystemTime(new Date('2026-10-29T18:58:00Z'));
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    await saveCheckin({ skipped: true });
    expect(pending()[0].body).toEqual({ skipped: true, madeAt: '2026-10-29T18:58:00.000Z' });
  });
});
