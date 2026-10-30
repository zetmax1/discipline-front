import { ApiError } from './api';

/**
 * Offline queue for daily-loop writes (F1). Every queued request is replay-safe on the server
 * (client-made ids, absolute values, Idempotency-Key), so sending one twice is harmless.
 * `key` identifies what a request sets ("session:<id>", "checkin:today"): a newer request with
 * the same key replaces the queued one but keeps its place, so order is preserved.
 */
export interface QueuedRequest {
  key: string;
  method: 'PUT' | 'POST';
  path: string;
  body: unknown;
  headers?: Record<string, string>;
}

export type Sender<T = unknown> = (request: QueuedRequest) => Promise<T>;

const STORAGE_KEY = 'sync-queue';
const listeners = new Set<() => void>();

function read(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function write(list: QueuedRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the queue lives only as long as this tab.
  }
  listeners.forEach(l => l());
}

export function pending(): QueuedRequest[] {
  return read();
}

export function enqueue(request: QueuedRequest) {
  const list = read();
  const i = list.findIndex(r => r.key === request.key);
  if (i >= 0) list[i] = request;
  else list.push(request);
  write(list);
}

/** Called whenever the queue changes (for a "N waiting to sync" indicator). */
export function onQueueChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A network failure or a server-side problem: worth retrying later. */
function retryable(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof ApiError) return err.status >= 500 || err.status === 408 || err.status === 429;
  return false;
}

let flushing: Promise<FlushResult> | null = null;

export interface FlushResult {
  sent: number;
  dropped: { request: QueuedRequest; error: unknown }[];
}

/** Sends queued requests in order until one fails in a retryable way. One flush at a time. */
export function flush(send: Sender): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = (async () => {
    const result: FlushResult = { sent: 0, dropped: [] };
    for (;;) {
      const [next] = read();
      if (!next) break;
      try {
        await send(next);
        result.sent++;
      } catch (err) {
        if (retryable(err)) break;
        result.dropped.push({ request: next, error: err });
      }
      const rest = read();
      // Remove what was sent (unless a newer state for the same key arrived meanwhile).
      if (rest[0] && rest[0].key === next.key && JSON.stringify(rest[0]) === JSON.stringify(next)) rest.shift();
      write(rest);
    }
    return result;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/**
 * Sends now; if offline (or the server is down) or older requests for this key are still
 * waiting, queues it instead. Rejections (4xx) are thrown to the caller.
 */
export async function sendOrQueue<T>(request: QueuedRequest, send: Sender<T>): Promise<{ queued: true } | { queued: false; result: T }> {
  if (read().some(r => r.key === request.key)) {
    enqueue(request);
    return { queued: true };
  }
  try {
    return { queued: false, result: await send(request) };
  } catch (err) {
    if (!retryable(err)) throw err;
    enqueue(request);
    return { queued: true };
  }
}
