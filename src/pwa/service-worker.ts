/** Cache names the worker owns (public/sw.js uses the same prefix). */
export const CACHE_PREFIX = 'discipline-';

const MANIFEST_HREF = '/manifest.webmanifest';

/**
 * F12A on: link the manifest (installable) and register /sw.js (offline app shell).
 * F12A off: remove both, and delete the worker's caches, so turning the flag off undoes it.
 */
export async function syncServiceWorker(enabled: boolean): Promise<void> {
  const link = document.head.querySelector<HTMLLinkElement>(`link[rel="manifest"][href="${MANIFEST_HREF}"]`);
  if (enabled && !link) {
    const el = document.createElement('link');
    el.rel = 'manifest';
    el.href = MANIFEST_HREF;
    document.head.appendChild(el);
  }
  if (!enabled) link?.remove();

  if (!('serviceWorker' in navigator)) return;
  if (enabled) {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return;
  }
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(r => r.unregister()));
  if (typeof caches !== 'undefined') {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith(CACHE_PREFIX)).map(n => caches.delete(n)));
  }
}
