// API client for the Discipline backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// --- Token management ---

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('auth_token');
}

export function getUser(): { id: number; name: string; email: string; role: string } | null {
  const raw = localStorage.getItem('auth_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: { id: number; name: string; email: string; role: string }): void {
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
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

// --- Auth API ---

export async function loginApi(email: string, password: string) {
  const data = await apiPost<{ token: string; user: { id: number; name: string; email: string; role: string } }>(
    '/auth/login',
    { email, password }
  );
  setToken(data.token);
  setUser(data.user);
  return data;
}

export async function registerApi(name: string, email: string, password: string) {
  const data = await apiPost<{ token: string; user: { id: number; name: string; email: string; role: string } }>(
    '/auth/register',
    { name, email, password }
  );
  setToken(data.token);
  setUser(data.user);
  return data;
}

export function logout() {
  removeToken();
  removeUser();
  removeDemoMode();
  window.location.href = '/login';
}
