import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SmartSchedule from './SmartSchedule';
import { Toaster } from '@/components/ui/toaster';
import { jsonResponse } from '@/test/fixtures/analytics';

const response = (over: Record<string, unknown> = {}) => ({
  blocks: [{ id: 'b1', name: 'Deep Work', category: 'deep-work', startTime: '20:00', endTime: '22:00', day: 'Monday' }],
  reasoning: ['Deep Work: Default placement — not enough history yet (placed around 09:00).'],
  placed_minutes: { 'deep-work': 600, study: 0, rest: 0 },
  shortfall_minutes: { 'deep-work': 0, study: 0, rest: 0 },
  ...over,
});

function renderPage() {
  return render(<><SmartSchedule /><Toaster /></>);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('auth_token', 'token');
});
afterEach(() => vi.restoreAllMocks());

describe('Smart Schedule generation', () => {
  it("shows the server's validation message for a 422", async () => {
    const msg = 'commitments[0].startTime: must be HH:MM between 00:00 and 24:00';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: msg, details: [] }, 422));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }));
    expect(await screen.findByText(msg)).toBeInTheDocument();
  });

  it('shows what could not be placed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(response({
      shortfall_minutes: { 'deep-work': 600, study: 0, rest: 0 },
    })));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }));
    expect(await screen.findByText('Could not fit 10 h of Deep Work.')).toBeInTheDocument();
  });

  it('says nothing about shortfall when every hour fit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(response()));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }));
    expect(await screen.findByText('Recommended Weekly Plan')).toBeInTheDocument();
    expect(screen.queryByText(/Could not fit/)).toBeNull();
  });
});

describe('Commitment days', () => {
  it('shows each commitment\'s days', () => {
    renderPage();
    expect(screen.getByText('Every day')).toBeInTheDocument();          // Sleep
    expect(screen.getAllByText('Mon, Wed, Fri').length).toBe(2);       // University, Gym
  });

  it('adds a commitment on Mon–Fri by default and lets the user change the days', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(response()));
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Work' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add commitment' }));
    expect(screen.getByText('Work').closest('div')).toHaveTextContent('Mon–Fri');

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Market' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sat' }));                 // add Saturday
    for (const d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) fireEvent.click(screen.getByRole('button', { name: d })); // drop weekdays
    fireEvent.click(screen.getByRole('button', { name: 'Add commitment' }));
    expect(screen.getByText('Market').closest('div')).toHaveTextContent('Sat');

    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }));
    await screen.findByText('Recommended Weekly Plan');
    const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const byName = Object.fromEntries(sent.commitments.map((c: { name: string; days: string[] }) => [c.name, c.days]));
    expect(byName.Work).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    expect(byName.Market).toEqual(['Saturday']);
  });

  it('cannot add a commitment with no days', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'X' } });
    for (const d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) fireEvent.click(screen.getByRole('button', { name: d }));
    expect(screen.getByRole('button', { name: 'Add commitment' })).toBeDisabled();
  });
});

describe('Save Weekly Plan', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 29, 12, 0)); // Thursday 2026-10-29 local
  });
  afterEach(() => vi.useRealTimers());

  function mockGenerateAndSave() {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith('/tasks/plan')) return jsonResponse({ planId: 'p', count: 2, replaced: 0 });
      return jsonResponse(response({
        blocks: [
          { id: 'f', name: 'Sleep', category: 'fixed', startTime: '23:00', endTime: '07:00', day: 'Monday' },
          { id: 'a', name: 'Deep Work', category: 'deep-work', startTime: '09:00', endTime: '11:00', day: 'Monday' },
          { id: 'b', name: 'Rest', category: 'rest', startTime: '19:00', endTime: '20:00', day: 'Sunday' },
        ],
      }));
    });
  }

  it('saves to next Mon–Sun by default with dates inside that week', async () => {
    const fetchMock = mockGenerateAndSave();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }));
    expect(await screen.findByLabelText('Target week')).toHaveValue('2026-11-02');
    fireEvent.click(screen.getByRole('button', { name: /save weekly plan/i }));
    await screen.findByText(/Saved 2 blocks/);

    const [url, init] = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/tasks/plan'))!;
    expect(init?.method).toBe('PUT');
    const body = JSON.parse(String(init?.body));
    expect(body.weekStart).toBe('2026-11-02');
    expect(body.tasks.map((t: { date: string; category: string }) => [t.date, t.category])).toEqual([
      ['2026-11-02', 'deep-work'], ['2026-11-08', 'rest'],
    ]);
    expect(String(url)).toMatch(/\/tasks\/plan$/);
  });

  it('saves to the week the user picks', async () => {
    const fetchMock = mockGenerateAndSave();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }));
    fireEvent.change(await screen.findByLabelText('Target week'), { target: { value: '2026-11-16' } });
    fireEvent.click(screen.getByRole('button', { name: /save weekly plan/i }));
    await screen.findByText(/Saved 2 blocks/);
    const [, init] = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/tasks/plan'))!;
    const body = JSON.parse(String(init?.body));
    expect(body.weekStart).toBe('2026-11-16');
    expect(body.tasks[0].date).toBe('2026-11-16');
  });
});

describe('Save Weekly Plan conflict', () => {
  it("shows the server's 409 message when the plan overlaps a manual block", async () => {
    const msg = 'block overlaps another block on the same date';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/tasks/plan')) return jsonResponse({ error: msg }, 409);
      return jsonResponse(response());
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }));
    fireEvent.click(await screen.findByRole('button', { name: /save weekly plan/i }));
    expect(await screen.findByText('Save Failed')).toBeInTheDocument();
    expect(screen.getByText(msg)).toBeInTheDocument();
  });
});

describe('Commitments and goals stay in this browser', () => {
  it('survive a reload', () => {
    const { unmount } = renderPage();
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Choir' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add commitment' }));
    fireEvent.change(screen.getByLabelText('Study'), { target: { value: '12.5' } });
    unmount();
    renderPage();
    expect(screen.getByText('Choir')).toBeInTheDocument();
    expect(screen.getByLabelText('Study')).toHaveValue(12.5);
  });
});
