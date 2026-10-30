import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import { day, jsonResponse } from '@/test/fixtures/analytics';

// Today's tasks would score high under the old client-side formula; the page must show the server's value.
const tasks = [{ id: 1, name: 'Focus', category: 'deep-work', startTime: '09:00', endTime: '12:00', status: 'completed', distractions: 0, energy: 3, date: '2026-10-29' }];

function mockApi(today: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/dashboard/today')) return jsonResponse(today);
    if (url.includes('/tasks')) return jsonResponse({ tasks, count: 1 });
    if (url.includes('/vocabulary/today')) return jsonResponse({ words: [], count: 0 });
    if (url.includes('/vocabulary')) return jsonResponse({ words: [], count: 0, total: 0, page: 1, pageSize: 30, totalPages: 0 });
    if (url.includes('/quote')) return jsonResponse({ quote: 'q', author: 'a' });
    return jsonResponse({}, 404);
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><Dashboard /></QueryClientProvider>);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('auth_token', 'token');
});
afterEach(() => vi.restoreAllMocks());

describe('Dashboard metrics', () => {
  it('shows the server score and — when nothing is due, never 0', async () => {
    const fetchMock = mockApi({ ...day('2026-10-29', { planned_minutes: 180, completed_minutes: 180, deep_work_minutes: 180, deep: 1 }), daily_deep_work_target_minutes: 180 });
    renderPage();
    expect(await screen.findByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    // the breakdown only renders once the server's metrics have arrived
    await waitFor(() => expect(screen.getByTestId('focus-breakdown')).toHaveTextContent('Completion —'));
    expect(screen.getByTestId('focus-score')).toHaveTextContent('—');
    expect(screen.getByTestId('planned')).toHaveTextContent('3h');
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/dashboard/today'))).toBe(true);
  });

  it('shows the score and its components', async () => {
    mockApi({ ...day('2026-10-29', { planned_minutes: 240, completed_minutes: 180, completion: 0.75, deep: 0.6667, distraction: 0.75, focus_score: 73, deep_work_minutes: 120 }), daily_deep_work_target_minutes: 180 });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('focus-score')).toHaveTextContent('73'));
    const breakdown = screen.getByTestId('focus-breakdown');
    expect(breakdown).toHaveTextContent('Completion 75%');
    expect(breakdown).toHaveTextContent('Deep 67%');
    expect(breakdown).toHaveTextContent('Distraction 75%');
    expect(screen.getByTestId('planned')).toHaveTextContent('4h');
    expect(screen.getByTestId('done')).toHaveTextContent('3h');
  });
});
