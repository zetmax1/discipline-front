import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Analytics from './Analytics';
import { day, focusPatterns, jsonResponse, periodReport } from '@/test/fixtures/analytics';

class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><Analytics /></QueryClientProvider>);
}

function mockApi(report: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/analytics/focus-patterns')) return jsonResponse(focusPatterns());
    if (url.includes('/analytics?range=')) return jsonResponse(report);
    return jsonResponse({}, 404);
  });
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  localStorage.clear();
  localStorage.setItem('auth_token', 'token');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Analytics page', () => {
  it('asks for more days and shows — for a missing score', async () => {
    mockApi(periodReport());
    renderPage();
    expect(await screen.findByText('Log 4 more days to see patterns.')).toBeInTheDocument();
    expect(screen.getByTestId('period-focus-score')).toHaveTextContent('—');
    expect(screen.getByTestId('period-focus-score')).not.toHaveTextContent('0');
  });

  it('shows insights from the report the page calls', async () => {
    mockApi(periodReport({
      focus_score: 80.5,
      days: [day('2026-10-26', { focus_score: 73, completion: 0.75 })],
      comparison: { previous_focus_score: 70, change: 10.5 },
      patterns: { insufficient_data: false, days_with_data: 9, window_days: 30, best_weekday: 'Monday',
        peak_hour: 9, trend: 'stable', consistency_score: 80, insights: ['Your best day is Monday.'] },
    }));
    renderPage();
    expect(await screen.findByText('Your best day is Monday.')).toBeInTheDocument();
    expect(screen.getByTestId('period-focus-score')).toHaveTextContent('80.5');
    expect(screen.getByTestId('score-change')).toHaveTextContent('+10.5');
  });

  it('reports a response that breaks the contract instead of rendering garbage', async () => {
    mockApi({ report: { daily_breakdown: [] } });
    renderPage();
    expect(await screen.findByText(/unexpected response/i)).toBeInTheDocument();
  });
});
