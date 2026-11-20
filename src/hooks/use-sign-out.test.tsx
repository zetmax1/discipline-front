import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSignOut } from './use-sign-out';
import { enqueue, pending } from '@/lib/sync-queue';
import * as api from '@/lib/api';

// Signing out with changes still queued on this device asks first: sync them, or discard them.
// They are never dropped silently (F13 review, owner note 3).

function Harness() {
  const { signOut, signOutDialog } = useSignOut();
  return <><button onClick={signOut}>Sign out</button>{signOutDialog}</>;
}

const renderHarness = () =>
  render(<QueryClientProvider client={new QueryClient()}><Harness /></QueryClientProvider>);

const queueTwo = () => {
  enqueue({ key: 'block:new:a', method: 'POST', path: '/tasks', body: { name: 'A' }, headers: { 'Idempotency-Key': 'aaaaaaaa' } });
  enqueue({ key: 'block:5', method: 'PUT', path: '/tasks/5', body: { startTime: '09:00' } });
};

let logout: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('auth_token', 'token');
  logout = vi.spyOn(api, 'logout').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('signing out', () => {
  it('signs out at once when nothing is waiting', () => {
    renderHarness();
    fireEvent.click(screen.getByText('Sign out'));
    expect(logout).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('with unsynced changes, asks first and keeps them until the user decides', () => {
    queueTwo();
    renderHarness();
    fireEvent.click(screen.getByText('Sign out'));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('You have 2 unsynced changes');
    expect(logout).not.toHaveBeenCalled();
    expect(pending()).toHaveLength(2);
  });

  it('"Sync now" sends them, then signs out', async () => {
    queueTwo();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 200 }));
    renderHarness();
    fireEvent.click(screen.getByText('Sign out'));
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls.map(c => String(c[0]))).toEqual([expect.stringMatching(/\/tasks$/), expect.stringMatching(/\/tasks\/5$/)]);
    expect(pending()).toEqual([]);
  });

  it('"Sync now" while still offline keeps the changes and stays signed in', async () => {
    queueTwo();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    renderHarness();
    fireEvent.click(screen.getByText('Sign out'));
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(await screen.findByText(/Couldn't sync yet/)).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('You have 2 unsynced changes');
    expect(logout).not.toHaveBeenCalled();
    expect(pending()).toHaveLength(2);
  });

  it('"Discard" signs out, which clears them', () => {
    queueTwo();
    renderHarness();
    fireEvent.click(screen.getByText('Sign out'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(logout).toHaveBeenCalledOnce();
  });

  it('"Cancel" keeps the user signed in with the changes', () => {
    queueTwo();
    renderHarness();
    fireEvent.click(screen.getByText('Sign out'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(logout).not.toHaveBeenCalled();
    expect(pending()).toHaveLength(2);
  });
});
