import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ErrorEvent } from '@sentry/react';

const init = vi.fn();
vi.mock('@sentry/react', () => ({ init }));

import { initSentry, scrubEvent } from './sentry';

beforeEach(() => init.mockClear());

describe('initSentry', () => {
  it('does nothing without a DSN', async () => {
    expect(await initSentry('')).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('starts Sentry collecting no personal data when a DSN is set', async () => {
    expect(await initSentry('https://public@o0.ingest.sentry.io/1', 'staging')).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
    const opts = init.mock.calls[0][0];
    expect(opts.dsn).toBe('https://public@o0.ingest.sentry.io/1');
    expect(opts.environment).toBe('staging');
    expect(opts.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ['user-agent', 'content-type'] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
    });
    expect(opts.beforeSend).toBe(scrubEvent);
  });
});

describe('scrubEvent', () => {
  it('drops query strings, cookies, auth headers, bodies and the user', () => {
    const event = {
      request: {
        url: 'https://app.example.com/planner?token=query-secret',
        query_string: 'token=query-secret',
        cookies: { s: 'cookie-secret' },
        data: '{"password":"body-secret"}',
        headers: { Authorization: 'Bearer header-secret', 'User-Agent': 'UA' },
      },
      user: { email: 'a@example.com' },
      breadcrumbs: [{ category: 'fetch', data: { url: 'https://api.example.com/api/tasks?date=2026-10-29' } }],
    } as unknown as ErrorEvent;
    const out = JSON.stringify(scrubEvent(event));
    for (const secret of ['query-secret', 'cookie-secret', 'body-secret', 'header-secret', 'a@example.com', 'date=2026']) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain('https://app.example.com/planner');
    expect(out).toContain('UA');
  });
});
