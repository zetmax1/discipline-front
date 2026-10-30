import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './use-local-storage';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('useLocalStorage', () => {
  it('falls back to the initial value for unreadable data', () => {
    localStorage.setItem('k', '{not json');
    const { result } = renderHook(() => useLocalStorage('k', ['default']));
    expect(result.current[0]).toEqual(['default']);
  });

  it('keeps working in memory when storage is full or blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('QuotaExceededError'); });
    const { result } = renderHook(() => useLocalStorage('k', 1));
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
  });

  it('persists values', () => {
    const { result } = renderHook(() => useLocalStorage('k', 1));
    act(() => result.current[1](5));
    expect(JSON.parse(localStorage.getItem('k') as string)).toBe(5);
  });
});
