import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncServiceWorker, CACHE_PREFIX } from './service-worker';

let register: ReturnType<typeof vi.fn>;
let unregister: ReturnType<typeof vi.fn>;
let deleted: string[];

beforeEach(() => {
  document.head.innerHTML = '';
  register = vi.fn(async () => ({}));
  unregister = vi.fn(async () => true);
  deleted = [];
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register, getRegistrations: async () => [{ unregister }] },
  });
  vi.stubGlobal('caches', {
    keys: async () => [`${CACHE_PREFIX}shell-v1`, `${CACHE_PREFIX}assets-v1`, 'someone-else'],
    delete: async (name: string) => { deleted.push(name); return true; },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('syncServiceWorker', () => {
  it('registers the worker and links the manifest when F12A is on', async () => {
    await syncServiceWorker(true);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(document.head.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/manifest.webmanifest');
    await syncServiceWorker(true);
    expect(document.head.querySelectorAll('link[rel="manifest"]')).toHaveLength(1);
  });

  it('removes the worker, its caches and the manifest when F12A is off', async () => {
    await syncServiceWorker(true);
    await syncServiceWorker(false);
    expect(unregister).toHaveBeenCalled();
    expect(deleted.sort()).toEqual([`${CACHE_PREFIX}assets-v1`, `${CACHE_PREFIX}shell-v1`]);
    expect(document.head.querySelector('link[rel="manifest"]')).toBeNull();
  });
});
