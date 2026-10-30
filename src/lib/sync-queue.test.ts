import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enqueue, flush, pending, sendOrQueue, type QueuedRequest } from './sync-queue';
import { ApiError } from './api';

const req = (key: string, body: unknown = {}): QueuedRequest => ({ key, method: 'PUT', path: `/x/${key}`, body });

beforeEach(() => localStorage.clear());

describe('sync queue', () => {
  it('keeps the latest state per key, in first-queued order', () => {
    enqueue(req('session:a', { distractions: 1 }));
    enqueue(req('checkin:today'));
    enqueue(req('session:a', { distractions: 2 }));
    expect(pending().map(r => [r.key, r.body])).toEqual([['session:a', { distractions: 2 }], ['checkin:today', {}]]);
  });

  it('sends in order and empties the queue', async () => {
    enqueue(req('a'));
    enqueue(req('b'));
    const sent: string[] = [];
    const result = await flush(async r => { sent.push(r.key); });
    expect(sent).toEqual(['a', 'b']);
    expect(result).toEqual({ sent: 2, dropped: [] });
    expect(pending()).toEqual([]);
  });

  it('stops at a network error or a server error and keeps the rest for later', async () => {
    enqueue(req('a'));
    enqueue(req('b'));
    await flush(async r => { if (r.key === 'a') throw new TypeError('Failed to fetch'); });
    expect(pending().map(r => r.key)).toEqual(['a', 'b']);
    await flush(async r => { if (r.key === 'b') throw new ApiError(503, { code: 'service_unavailable' }); });
    expect(pending().map(r => r.key)).toEqual(['b']);
  });

  it('drops a request the server rejects (it would never succeed) and reports it', async () => {
    enqueue(req('bad'));
    enqueue(req('good'));
    const result = await flush(async r => { if (r.key === 'bad') throw new ApiError(400, { code: 'session_invalid' }); });
    expect(result.dropped.map(d => d.request.key)).toEqual(['bad']);
    expect(pending()).toEqual([]);
  });

  it('sendOrQueue sends now when it can, and queues when offline', async () => {
    const send = vi.fn(async () => 'ok');
    expect(await sendOrQueue(req('a'), send)).toEqual({ queued: false, result: 'ok' });
    const offline = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    expect(await sendOrQueue(req('b'), offline)).toEqual({ queued: true });
    expect(pending().map(r => r.key)).toEqual(['b']);
    // A newer state for a key that is still queued waits behind it (order is kept).
    expect(await sendOrQueue(req('b', { n: 2 }), send)).toEqual({ queued: true });
    expect(pending()[0].body).toEqual({ n: 2 });
  });
});
