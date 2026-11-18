import { defineConfig, devices } from '@playwright/test';

// E2E runs a production build of the web app (vite preview, so the service worker works)
// against a mocked API (page.route in each spec): no backend, database or network needed.
// Every main flow runs at 390 px and 1440 px. E2E_SCREENSHOTS=<dir> also saves screenshots.
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
    serviceWorkers: 'block', // specs that test the PWA allow it
  },
  projects: [
    { name: 'mobile-390', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir --logLevel warn && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: { VITE_API_URL: E2E_API, VITE_SENTRY_DSN: '', VITE_TURNSTILE_SITE_KEY: '' },
  },
});
