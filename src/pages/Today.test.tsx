import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Today from './Today';
import { jsonResponse } from '@/test/fixtures/analytics';

type Call = { method: string; path: string; body: unknown };

function mockApi(opts: { checkin?: unknown; failSessions?: boolean; checkinStatus?: number } = {}) {
  const calls: Call[] = [];
  const serverNow = new Date().toISOString();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/api/, '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    if (path === '/checkins/today' && method === 'GET') {
      if (opts.checkinStatus) return jsonResponse({ error: 'x', code: 'internal_error' }, opts.checkinStatus);
      return jsonResponse({ date: '2026-10-30', checkin: opts.checkin ?? null, defaults: { sleepStartMin: 1380, sleepEndMin: 420 } });
    }
    if (path === '/checkins/today') {
      return jsonResponse({ checkin: { date: '2026-10-30', skipped: false, sleepStartMin: 1380, sleepEndMin: 420, sleepMinutes: 480,
        sleepQuality: body.sleepQuality, energy: body.energy, note: null } });
    }
    if (path === '/sessions/active') return jsonResponse({ session: null, serverNow });
    if (path === '/sessions') return jsonResponse({ sessions: [], serverNow });
    if (path.startsWith('/sessions/')) {
      if (opts.failSessions) throw new TypeError('Failed to fetch');
      return jsonResponse({ session: { id: path.split('/')[2], blockId: null, startedAt: body.startedAt, plannedMinutes: body.plannedMinutes,
        breakMinutes: body.breakMinutes, endedAt: body.endedAt ?? null, outcome: body.outcome ?? null, distractions: body.distractions }, serverNow });
    }
    if (path === '/shutdowns/today') return jsonResponse({ date: '2026-10-30', shutdown: null });
    if (path === '/tasks') return jsonResponse({ tasks: [], count: 0 });
    return jsonResponse({ error: 'not mocked', code: 'not_found' }, 404);
  });
  return calls;
}

function renderToday() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><Today /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('auth_token', 'token');
});
afterEach(() => vi.restoreAllMocks());

describe('Today', () => {
  it('asks for the morning check-in and sends the chosen values', async () => {
    const calls = mockApi();
    renderToday();
    expect(await screen.findByText('Good morning')).toBeInTheDocument();
    expect(screen.getByLabelText('Fell asleep')).toHaveValue('23:00');
    fireEvent.click(screen.getByRole('radio', { name: 'Energy: 4 of 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByText('Good morning')).not.toBeInTheDocument());
    const put = calls.find(c => c.method === 'PUT' && c.path === '/checkins/today');
    expect(put?.body).toMatchObject({ sleepStartMin: 1380, sleepEndMin: 420, sleepQuality: 3, energy: 4 });
  });

  it('teaches the loop on an empty day', async () => {
    mockApi({ checkin: { date: '2026-10-30', skipped: true, sleepStartMin: null, sleepEndMin: null, sleepMinutes: null, sleepQuality: null, energy: null, note: null } });
    renderToday();
    expect(await screen.findByText('Your day is open')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the Planner' })).toHaveAttribute('href', '/planner');
  });

  it('runs a focus session: start, count a distraction, finish into a break', async () => {
    const calls = mockApi({ checkin: { date: '2026-10-30', skipped: true, sleepStartMin: null, sleepEndMin: null, sleepMinutes: null, sleepQuality: null, energy: null, note: null } });
    renderToday();
    fireEvent.click(await screen.findByRole('button', { name: 'Start focus' }));
    expect(await screen.findByRole('timer')).toHaveTextContent(/^2[45]:\d\d$/);
    fireEvent.click(screen.getByRole('button', { name: 'I got distracted' }));
    expect(screen.getByTestId('distractions')).toHaveTextContent('1 distraction');
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('Break · 5 min')).toBeInTheDocument();
    const puts = calls.filter(c => c.method === 'PUT' && c.path.startsWith('/sessions/'));
    expect(new Set(puts.map(p => p.path)).size).toBe(1); // one session id
    expect(puts[0].body).toMatchObject({ plannedMinutes: 25, breakMinutes: 5, distractions: 0 });
    expect(puts.at(-1)?.body).toMatchObject({ distractions: 1, outcome: 'completed' });
  });

  it('keeps the timer running offline and shows what waits to sync', async () => {
    mockApi({ failSessions: true, checkin: { date: '2026-10-30', skipped: true, sleepStartMin: null, sleepEndMin: null, sleepMinutes: null, sleepQuality: null, energy: null, note: null } });
    renderToday();
    fireEvent.click(await screen.findByRole('button', { name: 'Start focus' }));
    expect(await screen.findByRole('timer')).toBeInTheDocument();
    expect(await screen.findByText('1 change waiting to sync')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('sync-queue')!)[0].body).toMatchObject({ plannedMinutes: 25 });
  });

  it('shows an error with retry when the day cannot be loaded', async () => {
    mockApi({ checkinStatus: 500 });
    renderToday();
    expect(await screen.findByText("Today's plan could not be loaded.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
