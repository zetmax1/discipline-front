import { test, expect, type Page } from '@playwright/test';
import { mockApi } from './api-mock';
import { focusPatterns, periodReport } from '../src/test/fixtures/analytics';
import { screen } from './screens';
import { expectNoSidewaysOverflow, expectTouchTargets } from './touch-targets';

const user = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user', timezone: 'Asia/Tashkent' };

async function mockApp(page: Page, features: string[]) {
  await mockApi(page, {
    'POST /auth/login': (route) => route.fulfill({ json: { token: 'e2e-token', user } }),
    'GET /features': (route) => route.fulfill({ json: { features } }),
    'GET /tasks': (route) => route.fulfill({
      json: {
        tasks: [{ id: 1, name: 'Morning deep work', category: 'deep-work', startTime: '09:00', endTime: '11:00',
          status: 'pending', distractions: 0, energy: 3, date: new URL(route.request().url()).searchParams.get('date') }],
        count: 1,
      },
    }),
    'GET /analytics': (route) => route.fulfill({
      json: periodReport({
        focus_score: 82, planned_minutes: 600, completed_minutes: 480, deep_work_minutes: 300, streak: 3,
        comparison: { previous_focus_score: 78, change: 4 },
        patterns: {
          insufficient_data: false, days_with_data: 12, window_days: 30, best_weekday: 'Tuesday', peak_hour: 9,
          trend: 'improving', consistency_score: 74, insights: ['Your best day is Tuesday, with an average focus score of 88.'],
        },
      }),
    }),
    'GET /analytics/focus-patterns': (route) => route.fulfill({ json: focusPatterns() }),
    'POST /tasks': (route) => route.fulfill({
      status: 409, json: { error: 'block overlaps another block on the same date', code: 'task_overlap' },
    }),
  });
}

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/^(Email)$/).fill('test@example.com');
  await page.locator('#password').fill('correct horse battery');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
}

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/** Picks a language from the header (desktop) or the settings sheet (phone). */
async function chooseLanguage(page: Page, settingsName: string, languageName: string, value: string) {
  if (isPhone(page)) await page.getByRole('button', { name: settingsName }).click();
  await page.getByRole('combobox', { name: languageName }).selectOption(value);
  if (isPhone(page)) {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  }
}

test('F12A on: Uzbek by default, switch to Russian, translated API errors, dark mode', async ({ page }, info) => {
  await mockApp(page, ['F12A']);
  await signIn(page);

  // Signed in with F12A on: the app is in Uzbek.
  await expect(page.locator('html')).toHaveAttribute('lang', 'uz');
  if (isPhone(page)) {
    const nav = page.getByRole('navigation', { name: 'Asosiy menyu' });
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Reja' }).click();
  } else {
    await expect(page.getByRole('navigation', { name: 'Asosiy menyu' })).toBeHidden();
    await page.getByRole('link', { name: 'Kunlik reja' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Kunlik reja' })).toBeVisible();
  await screen(page, info, 'planner-uz');

  await chooseLanguage(page, 'Sozlamalar', 'Til', 'ru');
  await expect(page.getByRole('heading', { name: 'План на день' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');

  // The server's error code is shown in the chosen language.
  await page.getByLabel('Задача').fill('Overlapping block');
  await page.getByRole('button', { name: 'Добавить блок' }).click();
  await expect(page.getByText('Этот блок пересекается с другим блоком в тот же день.')).toBeVisible();
  await screen(page, info, 'planner-ru');

  // Dark mode.
  if (isPhone(page)) await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('combobox', { name: 'Тема' }).selectOption('dark');
  if (isPhone(page)) {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  }
  await expect(page.locator('html')).toHaveClass(/dark/);
  await screen(page, info, 'planner-ru-dark');

  // Offline banner.
  await page.context().setOffline(true);
  await expect(page.getByRole('status')).toContainText('Нет подключения');
  await screen(page, info, 'offline-banner-ru');
  await page.context().setOffline(false);
  await expect(page.getByRole('status')).toBeHidden();
});

test('F12A on: login page remembers the language and has the pickers', async ({ page }, info) => {
  await mockApp(page, ['F12A']);
  await signIn(page);
  await page.evaluate(() => localStorage.removeItem('auth_token'));
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Kirish' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Til' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Mavzu' })).toBeVisible();
  await screen(page, info, 'login-uz');
});

test('F12A off: English, sidebar shell, no pickers', async ({ page }, info) => {
  await mockApp(page, []);
  await signIn(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveCount(0);
  await screen(page, info, 'dashboard-flag-off');
});

test.describe('PWA', () => {
  test.use({ serviceWorkers: 'allow' });

  test('F12A on: installable manifest, and the app opens offline from the cache', async ({ page, context }, info) => {
    await mockApp(page, ['F12A']);
    await signIn(page);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    const manifest = await (await page.request.get('/manifest.webmanifest')).json();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));

    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload(); // the worker now controls the page and caches the shell
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });

    await context.setOffline(true);
    await page.goto('/planner');
    await expect(page.getByRole('heading', { name: 'Kunlik reja' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Internet yoʻq');
    await screen(page, info, 'offline-app');
    await context.setOffline(false);
  });

  test('offline page (fallback when the app was never cached) shows all three languages', async ({ page }, info) => {
    await page.goto('/offline.html');
    await expect(page.getByRole('heading', { name: 'Internet yoʻq' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Нет подключения' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
    await expect(page.getByRole('link', { name: /Try again/ })).toHaveAttribute('href', '/');
    await screen(page, info, 'offline-page');
  });
});

test('F12A on, phone: every control on every screen is at least 44 px and nothing overflows sideways', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); // a phone requirement: same check in both projects
  await mockApp(page, ['F12A']);
  await page.route('**/api/dashboard/today', (route) => route.fulfill({ status: 503, json: { error: 'x', code: 'analytics_unavailable' } }));
  await signIn(page);
  await expect(page.locator('html')).toHaveAttribute('data-shell', 'f12a');
  // Uzbek date and number formats in the real browser (its Intl data for Uzbek is incomplete).
  await expect(page.getByText(/^(Yak|Dush|Sesh|Chor|Pay|Jum|Shan), \d{1,2}-(yan|fev|mar|apr|may|iyn|iyl|avg|sen|okt|noy|dek)$/)).toBeVisible();
  for (const path of ['/', '/planner', '/vocabulary', '/schedule', '/analytics']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await screen(page, info, `touch${path === '/' ? '-dashboard' : path.replace('/', '-')}`);
    await expectTouchTargets(page, path);
    await expectNoSidewaysOverflow(page, path);
  }
  await page.evaluate(() => localStorage.removeItem('auth_token'));
  await page.goto('/login');
  await expectTouchTargets(page);
});
