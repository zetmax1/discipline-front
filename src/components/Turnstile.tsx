import { useEffect, useRef } from 'react';
import { T } from '@/components/T';

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptLoading: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptLoading) {
    scriptLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptLoading = null;
        reject(new Error('Could not load the verification widget.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptLoading;
}

/** Cloudflare's public site key, set at build time. */
function turnstileSiteKey(): string {
  return import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
}

/**
 * Cloudflare Turnstile widget. Calls onToken with a token when solved and with
 * null when it expires or fails. Tokens are single-use: remount it (change its
 * React key) after every submit to get a new one.
 */
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const siteKey = turnstileSiteKey();

  useEffect(() => {
    if (!siteKey) return;
    let widgetId: string | undefined;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: token => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  if (!siteKey) {
    return <p className="text-sm text-destructive"><T k="auth.captchaNotConfigured" /></p>;
  }
  return <div ref={ref} data-testid="turnstile" className="flex justify-center" />;
}
