import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { revokeSession, applyProfileResponse, getToken, setToken, getUser, setUser } from './api';

beforeEach(() => {
  localStorage.clear();
  setToken('old-token');
  setUser({ id: 1, name: 'Ann', email: 'ann@example.com', role: 'user' });
});
afterEach(() => vi.restoreAllMocks());

describe('revokeSession', () => {
  it('calls POST /auth/logout with the current token, then clears local auth', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await revokeSession();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/logout$/);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer old-token');
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  it('still clears local auth when the server is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));
    await revokeSession();
    expect(getToken()).toBeNull();
  });
});

describe('applyProfileResponse', () => {
  it('stores the replacement token issued after a password change', () => {
    applyProfileResponse({ user: { id: 1, name: 'Ann', email: 'ann@example.com', role: 'user' }, token: 'new-token' });
    expect(getToken()).toBe('new-token');
  });

  it('keeps the current token when none is returned', () => {
    applyProfileResponse({ user: { id: 1, name: 'Annie', email: 'ann@example.com', role: 'user' } });
    expect(getToken()).toBe('old-token');
    expect(getUser()?.name).toBe('Annie');
  });
});

describe('device data of the signed-in user (F13 review H4)', () => {
  const seed = () => {
    localStorage.setItem('planner-week:2026-11-02', '{"tasks":[{"name":"Therapy"}]}');
    localStorage.setItem('planner-categories', '[]');
    localStorage.setItem('planner-rules', '[]');
    localStorage.setItem('sync-queue', '[{"key":"rule:new:x","method":"POST","path":"/recurring-rules","body":{}}]');
    localStorage.setItem('lang', 'uz');
  };
  const userData = () => Object.keys(localStorage).filter(k => k.startsWith('planner-') || k === 'sync-queue');

  it('logging out removes the planner caches and the sync queue, and keeps device settings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    seed();
    await revokeSession();
    expect(userData()).toEqual([]);
    expect(localStorage.getItem('lang')).toBe('uz');
  });

  it('another account signing in on this device never sees or replays the previous one', () => {
    seed();
    setUser({ id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' });
    expect(userData()).toEqual([]);
    expect(localStorage.getItem('lang')).toBe('uz');
  });

  it('the same account signing in again keeps its cache and its queued changes', () => {
    seed();
    setUser({ id: 1, name: 'Ann', email: 'ann@example.com', role: 'user' });
    expect(userData().sort()).toEqual(['planner-categories', 'planner-rules', 'planner-week:2026-11-02', 'sync-queue']);
  });
});
