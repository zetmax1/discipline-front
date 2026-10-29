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
