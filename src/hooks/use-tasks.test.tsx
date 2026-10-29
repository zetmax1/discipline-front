import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useTasks } from './use-tasks';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('auth_token', 'token');
});
afterEach(() => vi.restoreAllMocks());

const block = { name: 'Focus', category: 'deep-work' as const, startTime: '09:00', endTime: '10:00', energy: 3, date: '2026-10-29' };

describe('useTasks write errors', () => {
  it('addTask reports a 409 overlap instead of pretending success', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (init?.method === 'POST') return respond(409, { error: 'block overlaps another block on the same date' });
      return respond(200, { tasks: [], count: 0 });
    });
    const { result } = renderHook(() => useTasks(), { wrapper });
    let outcome: Awaited<ReturnType<typeof result.current.addTask>> | undefined;
    await act(async () => {
      outcome = await result.current.addTask(block);
    });
    expect(outcome).toEqual({ ok: false, error: 'block overlaps another block on the same date' });
  });

  it('addTask resolves ok when the server accepts the block', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (init?.method === 'POST') return respond(201, { task: { id: 1, ...block } });
      return respond(200, { tasks: [], count: 0 });
    });
    const { result } = renderHook(() => useTasks(), { wrapper });
    let outcome: Awaited<ReturnType<typeof result.current.addTask>> | undefined;
    await act(async () => {
      outcome = await result.current.addTask(block);
    });
    expect(outcome).toEqual({ ok: true });
  });

  it('shows the server error when an update is rejected', async () => {
    const errorToast = vi.spyOn(toast, 'error').mockImplementation(() => '');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (init?.method === 'PUT') return respond(400, { error: 'invalid task: endTime must be after startTime' });
      return respond(200, { tasks: [], count: 0 });
    });
    const { result } = renderHook(() => useTasks(), { wrapper });
    act(() => result.current.updateTask(1, { endTime: '08:00' }));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith('invalid task: endTime must be after startTime'));
  });
});
