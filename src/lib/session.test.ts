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
