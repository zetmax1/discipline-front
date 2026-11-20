import { test, expect, type Page } from '@playwright/test';
import { mockApi } from './api-mock';
import { screen } from './screens';
import { expectNoSidewaysOverflow, expectTouchTargets } from './touch-targets';

const user = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user', timezone: 'Asia/Tashkent' };
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

interface Session { id: string; blockId: number | null; startedAt: string; plannedMinutes: number; breakMinutes: number;
  endedAt: string | null; outcome: string | null; distractions: number }

/** A small in-memory API for the daily loop. */
async function mockDailyApi(page: Page, opts: { features?: string[]; activeSession?: Session } = {}) {
  const state = {
    checkin: null as unknown,
    sessions: new Map<string, Session>(opts.activeSession ? [[opts.activeSession.id, opts.activeSession]] : []),
    sessionPuts: [] as { id: string; body: Record<string, unknown> }[],
    shutdown: null as unknown,
    checkins: [] as Record<string, unknown>[],
    offline: false, // mocked routes still answer under context.setOffline(), so they check this too
  };
  const start = Math.max(0, nowMin() - 30);
  const block = (id: number, name: string, s: number, e: number, status = 'planned') => ({
    id, name, category: 'deep-work', date: today(), startMin: s, endMin: e,
    startTime: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
    endTime: `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`,
    status, distractions: 0, energy: 3, actualStartMin: null, actualEndMin: null, focusRating: null, note: null, movedFromId: null,
    categoryId: 1, categoryKind: 'focus', recurringRuleId: null, originalDate: null, recurringEdited: false,
  });
  const blocks = [block(1, 'Essay draft', start, Math.min(1440, start + 90)), block(2, 'Reading', Math.max(0, start - 120), Math.max(1, start - 60))];
  const serverNow = () => new Date().toISOString();
  await mockApi(page, {
    'POST /auth/login': r => r.fulfill({ json: { token: 'e2e-token', user } }),
    'GET /features': r => r.fulfill({ json: { features: opts.features ?? ['F12A', 'F1'] } }),
    'GET /tasks': r => r.fulfill({ json: { tasks: blocks, count: blocks.length } }),
    'GET /checkins/today': r => r.fulfill({ json: { date: today(), checkin: state.checkin, defaults: { sleepStartMin: 1380, sleepEndMin: 420 } } }),
    'PUT /checkins/today': r => {
      const body = r.request().postDataJSON();
      state.checkins.push(body);
      state.checkin = { date: today(), skipped: !!body.skipped, sleepStartMin: body.sleepStartMin ?? null, sleepEndMin: body.sleepEndMin ?? null,
        sleepMinutes: 480, sleepQuality: body.sleepQuality ?? null, energy: body.energy ?? null, note: null };
      return r.fulfill({ json: { checkin: state.checkin } });
    },
    'GET /sessions/active': r => r.fulfill({ json: { session: [...state.sessions.values()].find(s => !s.endedAt) ?? null, serverNow: serverNow() } }),
    'GET /sessions': r => r.fulfill({ json: { sessions: [...state.sessions.values()], serverNow: serverNow() } }),
    'GET /shutdowns/today': r => r.fulfill({ json: { date: today(), shutdown: state.shutdown } }),
    'PUT /shutdowns/today': r => {
      state.shutdown = { date: today(), win: r.request().postDataJSON().win || null, closedAt: serverNow() };
      return r.fulfill({ json: { shutdown: state.shutdown } });
    },
  });
  await page.route('**/api/sessions/*', r => {
    const id = new URL(r.request().url()).pathname.split('/').pop()!;
    if (r.request().method() !== 'PUT' || id === 'active') return r.fallback();
    if (state.offline) return r.abort('internetdisconnected');
    const body = r.request().postDataJSON();
    state.sessionPuts.push({ id, body });
    const prev = state.sessions.get(id);
    const s: Session = prev?.endedAt ? prev : {
      id, blockId: body.blockId ?? null, startedAt: prev?.startedAt ?? body.startedAt ?? serverNow(), plannedMinutes: body.plannedMinutes,
      breakMinutes: body.breakMinutes, distractions: body.distractions, endedAt: body.endedAt ?? null, outcome: body.outcome ?? null,
    };
    state.sessions.set(id, s);
    return r.fulfill({ json: { session: s, serverNow: serverNow() } });
  });
  await page.route('**/api/tasks/*/check-in', r => {
    const id = Number(new URL(r.request().url()).pathname.split('/')[3]);
    const b = blocks.find(x => x.id === id)!;
    Object.assign(b, { status: r.request().postDataJSON().status, focusRating: r.request().postDataJSON().focusRating ?? null });
    return r.fulfill({ json: { task: b } });
  });
  return state;
}

async function signIn(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#password').fill('correct horse battery');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
  // English for stable selectors (the language switch itself is covered by f12a.spec.ts).
  await page.evaluate(() => localStorage.setItem('locale', 'en'));
  await page.reload();
}

test('the daily loop: check-in, focus session with a distraction, block check-in, shutdown', async ({ page }, info) => {
  const state = await mockDailyApi(page);
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  await screen(page, info, 'today-checkin');

  await page.getByRole('radio', { name: 'Energy: 4 of 5' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Good morning')).toBeHidden();
  expect(state.checkins.at(-1)).toMatchObject({ sleepStartMin: 1380, sleepEndMin: 420, energy: 4 });

  await page.getByRole('button', { name: 'Start focus' }).click();
  await expect(page.getByRole('timer')).toHaveText(/^2[45]:\d\d$/);
  await page.getByRole('button', { name: 'I got distracted' }).click();
  await expect(page.getByTestId('distractions')).toHaveText('1 distraction');
  await screen(page, info, 'today-session');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText('Break · 5 min')).toBeVisible();
  await expect(page).toHaveTitle(/Session complete/);
  const ids = new Set(state.sessionPuts.map(p => p.id));
  expect(ids.size).toBe(1);
  expect(state.sessionPuts.at(-1)!.body).toMatchObject({ distractions: 1, outcome: 'completed' });

  // The earlier block is past: check it in from the timeline, rate it.
  const row = page.locator('div.border', { hasText: 'Reading' }).first();
  await row.getByRole('button', { name: 'Done' }).click();
  await row.getByRole('button', { name: /5 of 5/ }).click();
  await expect(row.getByText('Done', { exact: true })).toBeVisible();

  // Shutdown appears once everything is checked in or after 21:00; open it from the Essay check-in.
  await page.getByRole('button', { name: 'Done' }).first().click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Close the day' }).click();
  await page.getByLabel('One win today').fill('Finished the essay draft');
  await screen(page, info, 'today-shutdown');
  await page.getByRole('button', { name: 'Close the day' }).click();
  await expect(page.getByText('Day closed. Rest well.').first()).toBeVisible();
  await expect(page.getByText("Today's win: Finished the essay draft")).toBeVisible();
});

test('a running session shows the same time left in a second tab', async ({ page, context }) => {
  const startedAt = new Date(Date.now() - 5 * 60_000).toISOString();
  await mockDailyApi(page, { activeSession: { id: '6f1c2a7e-6a49-4a43-9c55-0d6f2b6a9f10', blockId: null, startedAt,
    plannedMinutes: 25, breakMinutes: 5, endedAt: null, outcome: null, distractions: 0 } });
  await signIn(page);
  const second = await context.newPage();
  await mockDailyApi(second, { activeSession: { id: '6f1c2a7e-6a49-4a43-9c55-0d6f2b6a9f10', blockId: null, startedAt,
    plannedMinutes: 25, breakMinutes: 5, endedAt: null, outcome: null, distractions: 0 } });
  await second.goto('/');
  const seconds = async (p: Page) => {
    const [m, s] = (await p.getByRole('timer').textContent())!.split(':').map(Number);
    return m * 60 + s;
  };
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(second.getByRole('timer')).toBeVisible();
  const [a, b] = await Promise.all([seconds(page), seconds(second)]);
  expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  expect(a).toBeGreaterThan(19 * 60);
  expect(a).toBeLessThanOrEqual(20 * 60);
});

test('offline: start, distractions and finish sync later as exactly one session', async ({ page, context }) => {
  const state = await mockDailyApi(page);
  await signIn(page);
  await page.getByRole('button', { name: 'Skip today' }).click();
  await expect(page.getByRole('button', { name: 'Start focus' })).toBeVisible();

  state.offline = true;
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Start focus' }).click();
  await page.getByRole('button', { name: 'I got distracted' }).click();
  await page.getByRole('button', { name: 'I got distracted' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText(/waiting to sync/)).toBeVisible();
  expect(state.sessionPuts).toHaveLength(0);

  state.offline = false;
  await context.setOffline(false);
  await expect(page.getByText(/waiting to sync/)).toBeHidden();
  expect(state.sessions.size).toBe(1);
  const s = [...state.sessions.values()][0];
  expect(s).toMatchObject({ distractions: 2, outcome: 'completed', plannedMinutes: 25 });
});

test('Today on a phone: 44 px controls and nothing past the edge', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockDailyApi(page);
  await signIn(page);
  await expect(page.getByText('Good morning')).toBeVisible();
  await expectTouchTargets(page, '/ (Today)');
  await expectNoSidewaysOverflow(page, '/ (Today)');
  await page.getByRole('button', { name: 'Skip today' }).click();
  await page.getByRole('button', { name: 'Start focus' }).click();
  await expectTouchTargets(page, 'focus timer');
  await expectNoSidewaysOverflow(page, 'focus timer');
  await screen(page, info, 'today-phone-session');
});
