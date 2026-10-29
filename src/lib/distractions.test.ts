import { describe, it, expect, vi, afterEach } from 'vitest';
import { adjustDistractionsApi } from './api';
import { applyDistractionDelta } from './distractions';

afterEach(() => vi.restoreAllMocks());

describe('adjustDistractionsApi', () => {
  it('POSTs the delta to the atomic endpoint instead of PUTting an absolute count', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ task: { id: 5, distractions: 3 } }), { status: 200 }),
    );
    await adjustDistractionsApi(5, 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/tasks\/5\/distractions$/);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ delta: 1 });
  });
});

describe('applyDistractionDelta (demo mode)', () => {
  it('clamps to 0..100', () => {
    expect(applyDistractionDelta(0, -1)).toBe(0);
    expect(applyDistractionDelta(100, 1)).toBe(100);
    expect(applyDistractionDelta(4, 1)).toBe(5);
    expect(applyDistractionDelta(4, -1)).toBe(3);
  });
});
