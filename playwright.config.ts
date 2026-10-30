import { defineConfig, devices } from '@playwright/test';

// E2E runs the real web app against a mocked API (page.route in each spec):
// no backend, database or network needed. Every main flow runs at 390 px and 1440 px.
const PORT = 8091;
export const E2E_API = 'http://api.e2e.invalid/api';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile-390', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { VITE_API_URL: E2E_API, VITE_SENTRY_DSN: '', VITE_TURNSTILE_SITE_KEY: '' },
  },
});
