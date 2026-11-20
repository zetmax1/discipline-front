import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cancelOccurrence, createRule, deleteCategory, fetchRange, saveBlock, updateRule } from './planner-api';
import { pending } from './sync-queue';

const ok = (body: unknown, status = 200) => Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status }));

describe('planner API', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('reads a range with the contract and asks the server to plan it', async () => {
    const fetchMock = vi.fn(() => ok({ tasks: [], exceptions: [{ ruleId: 1, date: '2026-11-04', reason: 'conflict' }], truncated: false }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await fetchRange('2026-11-02', '2026-11-08');
    expect(r.exceptions[0].reason).toBe('conflict');
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('/tasks?startDate=2026-11-02&endDate=2026-11-08');
  });

  it('rejects a range that does not match the contract', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({ tasks: [], exceptions: [{ ruleId: 1, date: '2026-11-04', reason: 'skipped' }], truncated: false })));
    await expect(fetchRange('2026-11-02', '2026-11-08')).rejects.toThrow(/Unexpected response/);
  });

  it('handles 204 answers and sends the scope', async () => {
    const fetchMock = vi.fn(() => ok(null, 204));
    vi.stubGlobal('fetch', fetchMock);
    await expect(cancelOccurrence(7)).resolves.toBeUndefined();
    await deleteCategory(3, 9);
    expect(String((fetchMock.mock.calls[1] as unknown[])[0])).toContain('/categories/3?reassignTo=9');
    vi.stubGlobal('fetch', vi.fn(() => ok({ rule: { id: 2, categoryId: 1, name: 'Gym', weekdays: [1], startMin: 60, endMin: 120,
      validFrom: '2026-11-04', validTo: null, splitFromRuleId: 1 } })));
    await updateRule(1, { startMin: 60 }, { scope: 'following', fromDate: '2026-11-04' });
  });

  it('queues block edits and new rules while offline, one entry per block', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    await saveBlock(5, { startTime: '09:00', endTime: '10:00' });
    await saveBlock(5, { startTime: '09:15', endTime: '10:15' });
    expect(await createRule({ name: 'Gym', weekdays: [1, 3, 5] })).toEqual({ queued: true });
    const q = pending();
    expect(q.map(r => r.path)).toEqual(['/tasks/5', '/recurring-rules']);
    expect(q[0].body).toEqual({ startTime: '09:15', endTime: '10:15' });
  });
});
