import type { ErrorEvent } from '@sentry/react';

const KEPT_HEADERS = new Set(['user-agent', 'content-type']);

const stripQuery = (url: string) => url.split('?')[0];

/** Removes anything that could hold secrets or personal data before an event is sent. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    const { url, headers } = event.request;
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.data;
    if (url) event.request.url = stripQuery(url);
    if (headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(headers).filter(([k]) => KEPT_HEADERS.has(k.toLowerCase())),
      );
    }
  }
  delete event.user;
  for (const crumb of event.breadcrumbs ?? []) {
    if (typeof crumb.data?.url === 'string') crumb.data.url = stripQuery(crumb.data.url);
  }
  return event;
}

/**
 * Starts Sentry when a DSN is configured (VITE_SENTRY_DSN). Without one the SDK is
 * not even downloaded: it is imported only here, on demand.
 */
export async function initSentry(
  dsn: string = import.meta.env.VITE_SENTRY_DSN ?? '',
  environment: string = import.meta.env.VITE_SENTRY_ENVIRONMENT ?? '',
): Promise<boolean> {
  if (!dsn) return false;
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: environment || undefined,
    // Collect nothing personal (SDK 11 defaults collect users, cookies, headers, bodies, query params).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ['user-agent', 'content-type'] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
    },
    beforeSend: scrubEvent, // second layer for anything an integration still attaches
  });
  return true;
}
