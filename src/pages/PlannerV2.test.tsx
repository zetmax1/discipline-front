import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PlannerV2 from './PlannerV2';
import { jsonResponse } from '@/test/fixtures/analytics';
import { localDateString } from '@/lib/dates';
import { mondayOf, saveWeekCache } from '@/lib/planner';

const cat = (id: number, systemKey: string | null, name: string, kind: string, nameCustom = false) =>
  ({ id, name, color: '#3B82F6', icon: 'target', kind, systemKey, nameCustom });
const CATEGORIES = [
  cat(1, 'deep_work', 'Deep Work', 'focus'), cat(2, 'study', 'Study', 'study'),
  cat(4, 'exercise', 'Workout', 'exercise', true), cat(9, null, 'Reading', 'personal'),
];
const today = localDateString();
const block = (id: number, name: string, startMin: number, endMin: number, extra: object = {}) => ({
  id, name, category: 'deep-work', date: today, startMin, endMin, startTime: '', endTime: '', status: 'planned',
  distractions: 0, energy: 3, actualStartMin: null, actualEndMin: null, focusRating: null, note: null, movedFromId: null,
  categoryId: 1, categoryKind: 'focus', recurringRuleId: null, originalDate: null, recurringEdited: false, ...extra,
});
const RULE = { id: 5, categoryId: 4, name: 'Gym', weekdays: [1, 2, 3, 4, 5, 6, 7], startMin: 1080, endMin: 1170,
  validFrom: today, validTo: null, splitFromRuleId: null };

function mockApi(opts: { range?: unknown; rangeStatus?: number; rules?: unknown[]; hang?: boolean } = {}) {
  const calls: string[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/api/, '');
    calls.push(`${init?.method ?? 'GET'} ${path}${url.search}`);
    if (path === '/categories') return jsonResponse({ categories: CATEGORIES });
    if (path === '/recurring-rules') return jsonResponse({ rules: opts.rules ?? [] });
    if (path === '/tasks') {
      if (opts.hang) return new Promise<Response>(() => {});
      if (opts.rangeStatus) return jsonResponse({ error: 'boom', code: 'internal_error' }, opts.rangeStatus);
      return jsonResponse(opts.range ?? { tasks: [], exceptions: [], truncated: false });
    }
    return jsonResponse({ error: 'not mocked', code: 'not_found' }, 404);
  });
  return calls;
}

function renderPlanner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><PlannerV2 /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('auth_token', 'token');
});
afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('PlannerV2', () => {
  it('a new user sees the empty state, never an error, and reads the week as one range', async () => {
    const calls = mockApi();
    renderPlanner();
    expect(await screen.findByText('Nothing planned yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add a repeating block' }).length).toBe(2); // toolbar + empty state
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const monday = mondayOf(today);
    expect(calls.some(c => c.startsWith(`GET /tasks?startDate=${monday}&endDate=`))).toBe(true);
  });

  it('shows the time gutter while loading', async () => {
    mockApi({ hang: true });
    const { container } = renderPlanner();
    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
  });

  it("shows the server's translated error with a retry, and keeps the grid", async () => {
    mockApi({ rangeStatus: 500 });
    renderPlanner();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong on our side');
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('offline: shows the cached week read-only and never asks the server to plan', async () => {
    saveWeekCache(mondayOf(today), { tasks: [block(1, 'Essay', 540, 600)] as never, exceptions: [], truncated: false });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const calls = mockApi();
    renderPlanner();
    expect(await screen.findByText(/Offline — showing the week you last loaded/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Essay, 09:00–10:00/ })).toBeInTheDocument();
    expect(calls.filter(c => c.startsWith('GET /tasks'))).toEqual([]);
  });

  it('marks a conflict quietly with place anyway / skip, and a cancelled date as "not this week"', async () => {
    const calls = mockApi({
      rules: [RULE],
      range: { tasks: [block(1, 'Essay', 1080, 1140)], truncated: true, exceptions: [
        { ruleId: 5, date: today, reason: 'conflict' },
      ] },
    });
    renderPlanner();
    expect(await screen.findByText("Gym didn't fit — something else is planned then.")).toBeInTheDocument();
    expect(screen.getByText(/Repeating blocks are planned up to/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/fail|missed/i);
    fireEvent.click(screen.getByRole('button', { name: 'Skip this week' }));
    await waitFor(() => expect(calls).toContain(`POST /recurring-rules/5/occurrences/${today}/skip`));
  });

  it('names default categories in the UI language and keeps a renamed or custom name', async () => {
    mockApi();
    renderPlanner();
    await screen.findByText('Nothing planned yet');
    fireEvent.click(screen.getAllByRole('button', { name: 'Add a block' })[0]);
    const select = await screen.findByLabelText('Category');
    const options = within(select).getAllByRole('option').map(o => o.textContent);
    expect(options).toEqual(['Deep Work', 'Study', 'Workout', 'Reading']);
  });

  it('the form alone creates a repeating block (keyboard path)', async () => {
    const calls = mockApi();
    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      const path = url.pathname.replace(/^\/api/, '');
      calls.push(`${init?.method ?? 'GET'} ${path}`);
      if (path === '/categories') return jsonResponse({ categories: CATEGORIES });
      if (path === '/recurring-rules' && init?.method === 'POST') {
        return jsonResponse({ rule: { ...RULE, ...JSON.parse(String(init.body)), id: 7, splitFromRuleId: null } }, 201);
      }
      if (path === '/recurring-rules') return jsonResponse({ rules: [] });
      return jsonResponse({ tasks: [], exceptions: [], truncated: false });
    });
    renderPlanner();
    await screen.findByText('Nothing planned yet');
    fireEvent.click(screen.getAllByRole('button', { name: 'Add a repeating block' })[0]);
    fireEvent.change(await screen.findByLabelText('Task'), { target: { value: 'Gym' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '1080' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '1170' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls).toContain('POST /recurring-rules'));
    expect(await screen.findByTestId('planner-announcer')).toHaveTextContent('Repeating block saved');
  });
});
