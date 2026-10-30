import { useEffect } from 'react';
import { useFeature } from '@/hooks/use-features';
import { syncServiceWorker } from './service-worker';

/**
 * Applies the F12A app shell outside React's tree: `data-shell="f12a"` on <html> (turns on the
 * 44 px phone touch targets in index.css) and the service worker (production builds only:
 * Vite's dev server must not be cached).
 */
export function ShellSync() {
  const enabled = useFeature('F12A');
  useEffect(() => {
    if (enabled) document.documentElement.dataset.shell = 'f12a';
    else delete document.documentElement.dataset.shell;
    if (!import.meta.env.PROD) return;
    syncServiceWorker(enabled).catch(() => {
      // Unsupported or blocked (private mode): the app works without it.
    });
  }, [enabled]);
  return null;
}
