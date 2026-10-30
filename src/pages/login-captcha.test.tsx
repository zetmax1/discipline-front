import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import Login from './Login';
import { jsonResponse } from '@/test/fixtures/analytics';

// A stand-in for Cloudflare's widget: each render immediately "solves" with a fresh token.
let issued = 0;
function installTurnstile() {
  issued = 0;
  window.turnstile = {
    render: (_el, opts) => {
      issued += 1;
      opts.callback(`token-${issued}`);
      return `widget-${issued}`;
    },
    remove: vi.fn(),
  };
}

function bodyOf(call: unknown[]) {
  return JSON.parse(String((call[1] as RequestInit).body));
}

function fillLogin() {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'whatever-pass' } });
}

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key-for-tests');
  installTurnstile();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete window.turnstile;
});

describe('Login captcha', () => {
  it('shows no widget until the server asks for one', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.queryByTestId('turnstile')).toBeNull();
  });

  it('shows the widget after a captchaRequired 401 and sends a fresh token next time', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: 'invalid email or password', captchaRequired: true }, 401))
      .mockResolvedValueOnce(jsonResponse({ token: 't', user: { id: 1, name: 'A', email: 'a@example.com', role: 'user' } }));
    vi.spyOn(toast, 'error').mockImplementation(() => '');
    render(<MemoryRouter><Login /></MemoryRouter>);
    fillLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByTestId('turnstile')).toBeInTheDocument();
    expect(bodyOf(fetchMock.mock.calls[0]).turnstileToken).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(bodyOf(fetchMock.mock.calls[1]).turnstileToken).toBe('token-1');
  });

  it('tells the user how long to wait on a 429', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: 'Too many failed login attempts. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '8' } },
    ));
    const errorToast = vi.spyOn(toast, 'error').mockImplementation(() => '');
    render(<MemoryRouter><Login /></MemoryRouter>);
    fillLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith(
      'Too many failed login attempts. Please try again later. Try again in 8 s.'));
  });
});

describe('Registration captcha', () => {
  function openRegister() {
    render(<MemoryRouter><Login /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Ann' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ann@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'long-enough-pw' } });
  }

  it('always shows the widget and sends its token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ token: 't', user: { id: 1, name: 'Ann', email: 'ann@example.com', role: 'user' } }, 201));
    openRegister();
    expect(screen.getByTestId('turnstile')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: /create account/i });
    await waitFor(() => expect(submit).toBeEnabled()); // enabled once the widget is solved
    fireEvent.click(submit);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(bodyOf(fetchMock.mock.calls[0]).turnstileToken).toBe('token-1');
  });

  it('cannot be submitted before the widget is solved', () => {
    window.turnstile = { render: () => 'unsolved', remove: vi.fn() };
    openRegister();
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  it('says so when no site key is configured', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    openRegister();
    expect(screen.getByText(/verification is not configured/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });
});
