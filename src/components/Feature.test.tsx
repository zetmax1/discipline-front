import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Feature } from './Feature';
import { jsonResponse } from '@/test/fixtures/analytics';

function mockFeatures(response: () => Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).endsWith('/features')) return response();
    return jsonResponse({}, 404);
  });
}

function renderGate(flag: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Feature flag={flag}>new feature</Feature>
      <span>always</span>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('auth_token', 'token');
});
afterEach(() => vi.restoreAllMocks());

describe('<Feature>', () => {
  it('shows its children when the server lists the flag', async () => {
    mockFeatures(async () => jsonResponse({ features: ['F1', 'F12A'] }));
    renderGate('F12A');
    expect(await screen.findByText('new feature')).toBeInTheDocument();
  });

  it('hides its children when the flag is off', async () => {
    const fetch = mockFeatures(async () => jsonResponse({ features: ['F1'] }));
    renderGate('F12A');
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await screen.findByText('always');
    expect(screen.queryByText('new feature')).not.toBeInTheDocument();
  });

  it('hides its children while loading and when the request fails', async () => {
    let fail!: () => void;
    mockFeatures(() => new Promise((_, reject) => { fail = () => reject(new TypeError('offline')); }));
    renderGate('F1');
    expect(screen.queryByText('new feature')).not.toBeInTheDocument();
    await waitFor(() => expect(fail).toBeDefined());
    fail();
    await screen.findByText('always');
    expect(screen.queryByText('new feature')).not.toBeInTheDocument();
  });

  it('never asks the server in demo mode without an account', async () => {
    localStorage.clear();
    localStorage.setItem('demo_mode', 'true');
    const fetch = mockFeatures(async () => jsonResponse({ features: ['F1'] }));
    renderGate('F1');
    await screen.findByText('always');
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText('new feature')).not.toBeInTheDocument();
  });
});
