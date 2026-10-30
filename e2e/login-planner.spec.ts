import { test, expect } from '@playwright/test';
import { mockApi } from './api-mock';

const user = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user', timezone: 'Asia/Tashkent' };

test('a user signs in and sees today\'s blocks in the planner', async ({ page }) => {
  let loginBody: unknown;
  await mockApi(page, {
    'POST /auth/login': (route) => {
      loginBody = route.request().postDataJSON();
      return route.fulfill({ json: { token: 'e2e-token', user } });
    },
    'GET /me': (route) => route.fulfill({ json: { user } }),
    'GET /features': (route) => route.fulfill({ json: { features: [] } }),
    'GET /tasks': (route) => {
      const date = new URL(route.request().url()).searchParams.get('date');
      return route.fulfill({
        json: {
          tasks: [{ id: 1, name: 'Morning deep work', category: 'deep-work', startTime: '09:00', endTime: '11:00',
            status: 'planned', distractions: 0, energy: 3, date }],
          count: 1,
        },
      });
    },
  });

  await page.goto('/planner');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: /sign in/i }).click();

  expect(loginBody).toEqual({ email: 'test@example.com', password: 'correct horse battery' });
  await expect(page).toHaveURL(/\/$/);

  // Under 768 px the navigation sits behind the sidebar toggle.
  const nav = page.getByRole('link', { name: 'Daily Planner' });
  if (!(await nav.isVisible())) await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();
  await nav.click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByRole('heading', { name: 'Daily Planner' })).toBeVisible();
  await expect(page.getByText('Morning deep work').first()).toBeVisible();
});
