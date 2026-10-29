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
