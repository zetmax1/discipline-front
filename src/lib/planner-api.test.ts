import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cancelOccurrence, createBlock, createCategory, createRule, deleteCategory, fetchRange, saveBlock, updateRule } from './planner-api';
import { flush, pending } from './sync-queue';
import { sendRequest } from './daily-api';

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

  it('sends every queued create with its own Idempotency-Key, and the replay reuses it', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    expect(await createBlock({ name: 'Read', date: '2026-11-30', startTime: '09:00', endTime: '10:00' })).toEqual({ queued: true });
    expect(await createRule({ name: 'Gym', weekdays: [1, 3, 5] })).toEqual({ queued: true });
    expect(await createCategory({ name: 'Reading', color: '#3B82F6', icon: 'book-open', kind: 'study' })).toEqual({ queued: true });
    const q = pending();
    expect(q.map(r => r.path)).toEqual(['/tasks', '/recurring-rules', '/categories']);
    const keys = q.map(r => r.headers?.['Idempotency-Key']);
    keys.forEach(k => expect(k).toMatch(/^[0-9a-f-]{36}$/));
    expect(new Set(keys).size).toBe(3);

    // The first flush loses the answer (502 after the server committed); the retry carries the same keys.
    const sent: (string | undefined)[] = [];
    const header = (init: unknown) => new Headers((init as RequestInit | undefined)?.headers).get('Idempotency-Key') ?? undefined;
    vi.stubGlobal('fetch', vi.fn((_url: unknown, init: unknown) => { sent.push(header(init)); return ok({}, 502); }));
    await flush(sendRequest);
    vi.stubGlobal('fetch', vi.fn((_url: unknown, init: unknown) => { sent.push(header(init)); return ok({}, 201); }));
    await flush(sendRequest);
    expect(sent).toEqual([keys[0], ...keys]);
    expect(pending()).toEqual([]);
  });

  it('sends the key when a create goes out at once', async () => {
    const fetchMock = vi.fn((_url: unknown, _init: unknown) => ok({ category: { id: 9, name: 'Reading', color: '#3B82F6', icon: 'book-open',
      kind: 'study', systemKey: null, nameCustom: true } }, 201));
    vi.stubGlobal('fetch', fetchMock);
    const r = await createCategory({ name: 'Reading', color: '#3B82F6', icon: 'book-open', kind: 'study' });
    expect(r).toMatchObject({ queued: false, result: { id: 9 } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
  });
});
