import type { Page, Route } from '@playwright/test';
import { E2E_API } from '../playwright.config';

type Handler = (route: Route) => Promise<void> | void;

/**
 * Serves the API from `handlers` ("GET /tasks" → handler, matched on the path without the
 * query). Any other API request gets a 404, so a spec never depends on a real server.
 */
export async function mockApi(page: Page, handlers: Record<string, Handler>) {
  await page.route(`${E2E_API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const key = `${route.request().method()} ${url.pathname.replace(/^\/api/, '')}`;
    const handler = handlers[key];
    if (handler) return handler(route);
    return route.fulfill({ status: 404, json: { error: 'not mocked in e2e: ' + key } });
  });
}
