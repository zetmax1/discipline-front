// API client for the Discipline backend
import type { z } from 'zod/v4';
import { FocusPatternsResponse, PeriodReport, SmartScheduleResponse, TodayResponse } from '@/contracts/analytics';
import { FeaturesResponse } from '@/contracts/features';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// --- Token management ---

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  timezone?: string; // IANA zone used by the server for "today"
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('auth_token');
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem('auth_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: AuthUser): void {
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export function removeUser(): void {
  localStorage.removeItem('auth_user');
}

// --- Demo mode ---

export function isDemoMode(): boolean {
  return localStorage.getItem('demo_mode') === 'true';
}

export function setDemoMode(): void {
  localStorage.setItem('demo_mode', 'true');
}

export function removeDemoMode(): void {
  localStorage.removeItem('demo_mode');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

/** Demo mode without an account: server-backed features are unavailable. */
export function isDemoOnly(): boolean {
  return isDemoMode() && !isAuthenticated();
}

/**
 * After a 401, signed-in users go to /login. Demo users stay put: /login would
 * redirect them straight back to "/", looping between the two.
 */
export function shouldRedirectToLogin(pathname: string): boolean {
  return !isDemoMode() && pathname !== '/login';
}

// --- HTTP helpers ---

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If unauthorized, clear token and redirect to login
  if (res.status === 401) {
    removeToken();
    removeUser();
    if (shouldRedirectToLogin(window.location.pathname)) {
      window.location.href = '/login';
    }
  }

  return res;
}

/** A non-2xx response: the server's `error` text, plus its status, body and Retry-After. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown>;
  /** Seconds from the Retry-After header (429), if any. */
  readonly retryAfter?: number;

  constructor(status: number, body: Record<string, unknown>, retryAfter?: number) {
    super(typeof body.error === 'string' && body.error ? body.error : 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({ error: 'Request failed' }));
  const retry = Number(res.headers.get('Retry-After'));
  return new ApiError(res.status, body ?? {}, Number.isFinite(retry) && retry > 0 ? retry : undefined);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

/** Any method, with extra headers (e.g. Idempotency-Key). */
export async function apiSend<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await apiFetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

// --- Auth API ---

/** turnstileToken is sent once the server has answered captchaRequired. */
export async function loginApi(email: string, password: string, turnstileToken?: string) {
  const data = await apiPost<{ token: string; user: AuthUser }>(
    '/auth/login',
    turnstileToken ? { email, password, turnstileToken } : { email, password }
  );
  setToken(data.token);
  setUser(data.user);
  return data;
}

export async function registerApi(name: string, email: string, password: string, turnstileToken: string) {
  const data = await apiPost<{ token: string; user: AuthUser }>(
    '/auth/register',
    { name, email, password, turnstileToken }
  );
  setToken(data.token);
  setUser(data.user);
  return data;
}

/**
 * Revokes every token of this user on the server (best effort), then clears local auth.
 * The server bumps the user's token version, so a copied token stops working too.
 */
export async function revokeSession(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Offline: the token still expires within 24h; clear it locally regardless.
    }
  }
  removeToken();
  removeUser();
  removeDemoMode();
}

export function logout() {
  void revokeSession().finally(() => {
    window.location.href = '/login';
  });
}

/** Stores the PUT /me result; a password change returns a replacement token. */
export function applyProfileResponse(res: { user: AuthUser; token?: string }): void {
  setUser(res.user);
  if (res.token) setToken(res.token);
}

// --- Tasks API ---

/** Atomically adds +1/-1 to a block's distraction count (server clamps to 0-100). */
export async function adjustDistractionsApi(id: number | string, delta: 1 | -1) {
  return apiPost<{ task: { id: number; distractions: number } }>(`/tasks/${id}/distractions`, { delta });
}

// --- Analytics API ---

/** Thrown when a response does not match its contract in src/contracts/. */
export class ContractError extends Error {
  constructor(what: string, issues: string) {
    super(`Unexpected response from ${what}: ${issues}`);
  }
}

function parseWith<S extends z.ZodType>(schema: S, what: string) {
  return (value: unknown): z.infer<S> => {
    const result = schema.safeParse(value);
    if (result.error) throw new ContractError(what, result.error.message);
    return result.data;
  };
}

export async function fetchAnalytics(range: 'week' | 'month'): Promise<PeriodReport> {
  return apiGet<unknown>(`/analytics?range=${range}`).then(parseWith(PeriodReport, 'analytics'));
}

export async function generateSmartSchedule(body: unknown): Promise<SmartScheduleResponse> {
  return apiPost<unknown>('/analytics/smart-schedule', body).then(parseWith(SmartScheduleResponse, 'smart schedule'));
}

export async function fetchToday(): Promise<TodayResponse> {
  return apiGet<unknown>('/dashboard/today').then(parseWith(TodayResponse, 'dashboard'));
}

export async function fetchFocusPatterns(days: number = 30): Promise<FocusPatternsResponse> {
  return apiGet<unknown>(`/analytics/focus-patterns?days=${days}`).then(parseWith(FocusPatternsResponse, 'focus patterns'));
}

// --- Feature flags ---

/** Ids of the features switched on on the server (FEATURE_<id>=true). */
export async function fetchFeatures(): Promise<FeaturesResponse> {
  return apiGet<unknown>('/features').then(parseWith(FeaturesResponse, 'features'));
}
