import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import Login from './Login';
import Analytics from './Analytics';
import SmartSchedule from './SmartSchedule';
import { shouldRedirectToLogin } from '@/lib/api';
import { jsonResponse } from '@/test/fixtures/analytics';

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}>{ui}</QueryClientProvider></MemoryRouter>);
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('Login errors', () => {
  it('toasts the error that was actually caught', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'Too many failed login attempts. Please try again later.' }, 429));
    const errorToast = vi.spyOn(toast, 'error').mockImplementation(() => '');
    wrap(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'whatever-pass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith('Too many failed login attempts. Please try again later.'));
  });
});

describe('demo mode', () => {
  beforeEach(() => localStorage.setItem('demo_mode', 'true'));

  it.each([['Analytics', <Analytics />], ['Smart Schedule', <SmartSchedule />]])(
    '%s shows a notice instead of calling the API',
    async (_name, page) => {
      const fetchMock = vi.spyOn(globalThis, 'fetch');
      wrap(page);
      expect(await screen.findByText('Not available in demo mode')).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('a 401 does not bounce a demo user between /login and /', () => {
    expect(shouldRedirectToLogin('/analytics')).toBe(false);
  });

  it('a 401 still sends a signed-in user to /login', () => {
    localStorage.removeItem('demo_mode');
    expect(shouldRedirectToLogin('/analytics')).toBe(true);
    expect(shouldRedirectToLogin('/login')).toBe(false);
  });
});
