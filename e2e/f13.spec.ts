import { test, expect, type Page } from '@playwright/test';
import { mockApi } from './api-mock';
import { screen } from './screens';
import { expectNoSidewaysOverflow, expectTouchTargets } from './touch-targets';

/**
 * F13: plan a university timetable (Mon/Wed/Fri 09:00–12:00), gym 3×/week (18:00–19:30) and four
 * focus blocks in one pass, edit Wednesday's gym "only this one", cancel one occurrence, move a
 * block by drag (mouse) or long press (touch). The mocked API plans recurring blocks like the
 * server does (from today, skipping exceptions and clashes); the web never plans them itself.
 */

const user = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user', timezone: 'Asia/Tashkent' };
const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
const iso = (s: string) => ((parse(s).getDay() + 6) % 7) + 1;
const clock = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const mins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const today = fmt(new Date());
const nextMonday = addDays(today, 8 - iso(today));
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CATEGORIES = [
  ['deep_work', 'Deep Work', 'focus', '#3B82F6', 'target'], ['study', 'Study', 'study', '#8B5CF6', 'book-open'],
  ['admin', 'Admin', 'admin', '#6B7280', 'briefcase'], ['exercise', 'Gym', 'exercise', '#10B981', 'dumbbell'],
  ['rest', 'Rest', 'rest', '#F59E0B', 'coffee'], ['personal', 'Personal', 'personal', '#EC4899', 'user'],
].map(([systemKey, name, kind, color, icon], i) => ({ id: i + 1, name, kind, color, icon, systemKey, nameCustom: false }));

type Block = Record<string, unknown> & { id: number; date: string; startMin: number; endMin: number; status: string;
  recurringRuleId: number | null; originalDate: string | null };
type Rule = { id: number; categoryId: number; name: string; weekdays: number[]; startMin: number; endMin: number;
  validFrom: string; validTo: string | null; splitFromRuleId: null };
type Exception = { ruleId: number; date: string; reason: 'cancelled' | 'conflict' | 'moved' };

async function mockPlannerApi(page: Page) {
  const state = { blocks: [] as Block[], rules: [] as Rule[], exceptions: [] as Exception[], puts: [] as { id: number; body: Record<string, unknown> }[],
    rangeReads: 0, nextId: 100 };
  const kindOf = (id: number) => CATEGORIES.find(c => c.id === id)!.kind;
  const make = (fields: { name: string; categoryId: number; date: string; startMin: number; endMin: number; ruleId?: number }): Block => ({
    id: state.nextId++, name: fields.name, category: 'personal', date: fields.date, startMin: fields.startMin, endMin: fields.endMin,
    startTime: clock(fields.startMin), endTime: clock(fields.endMin), status: 'planned', distractions: 0, energy: 3,
    actualStartMin: null, actualEndMin: null, focusRating: null, note: null, movedFromId: null,
    categoryId: fields.categoryId, categoryKind: kindOf(fields.categoryId), recurringRuleId: fields.ruleId ?? null,
    originalDate: null, recurringEdited: false, source: fields.ruleId ? 'recurring' : 'manual',
  });
  const clash = (date: string, s: number, e: number) =>
    state.blocks.some(b => b.date === date && !['skipped', 'moved'].includes(b.status) && b.startMin < e && b.endMin > s);
  const materialize = (from: string, to: string) => {
    for (let d = from < today ? today : from; d <= to; d = addDays(d, 1)) {
      for (const r of state.rules) {
        if (d < r.validFrom || (r.validTo && d > r.validTo) || !r.weekdays.includes(iso(d))) continue;
        if (state.exceptions.some(x => x.ruleId === r.id && x.date === d)) continue;
        if (state.blocks.some(b => b.recurringRuleId === r.id && (b.originalDate ?? b.date) === d)) continue;
        if (clash(d, r.startMin, r.endMin)) { state.exceptions.push({ ruleId: r.id, date: d, reason: 'conflict' }); continue; }
        state.blocks.push(make({ name: r.name, categoryId: r.categoryId, date: d, startMin: r.startMin, endMin: r.endMin, ruleId: r.id }));
      }
    }
  };
  await mockApi(page, {
    'POST /auth/login': r => r.fulfill({ json: { token: 'e2e-token', user } }),
    'GET /me': r => r.fulfill({ json: { user } }),
    'GET /features': r => r.fulfill({ json: { features: ['F12A', 'F1', 'F13'] } }),
    'GET /categories': r => r.fulfill({ json: { categories: CATEGORIES } }),
    'GET /recurring-rules': r => r.fulfill({ json: { rules: state.rules } }),
    'POST /recurring-rules': r => {
      const body = r.request().postDataJSON();
      const rule: Rule = { id: state.nextId++, validTo: null, splitFromRuleId: null, ...body };
      state.rules.push(rule);
      return r.fulfill({ status: 201, json: { rule } });
    },
    'POST /tasks': r => {
      const body = r.request().postDataJSON();
      const b = make({ name: body.name, categoryId: body.categoryId, date: body.date, startMin: mins(body.startTime), endMin: mins(body.endTime) });
      if (clash(b.date, b.startMin, b.endMin)) return r.fulfill({ status: 409, json: { error: 'overlap', code: 'task_overlap' } });
      state.blocks.push(b);
      return r.fulfill({ status: 201, json: { message: 'ok', task: b } });
    },
    'GET /tasks': r => {
      const url = new URL(r.request().url());
      const from = url.searchParams.get('startDate'), to = url.searchParams.get('endDate');
      if (!from || !to) { // the other screens' single-day read
        const day = url.searchParams.get('date') ?? today;
        const tasks = state.blocks.filter(b => b.date === day);
        return r.fulfill({ json: { tasks, count: tasks.length } });
      }
      state.rangeReads++;
      materialize(from, to);
      return r.fulfill({ json: {
        tasks: state.blocks.filter(b => b.date >= from && b.date <= to),
        exceptions: state.exceptions.filter(x => x.date >= from && x.date <= to), truncated: false } });
    },
    'GET /dashboard/today': r => r.fulfill({ status: 404, json: { error: 'n/a', code: 'not_found' } }),
  });
  await page.route('**/api/tasks/*', r => {
    const id = Number(new URL(r.request().url()).pathname.split('/')[3]);
    const b = state.blocks.find(x => x.id === id);
    if (!b) return r.fallback();
    if (r.request().method() === 'PUT') {
      const body = r.request().postDataJSON();
      state.puts.push({ id, body });
      if (body.startTime) b.startMin = mins(body.startTime);
      if (body.endTime) b.endMin = mins(body.endTime);
      if (body.date && body.date !== b.date) { if (b.recurringRuleId) b.originalDate = b.originalDate ?? b.date; b.date = body.date; }
      if (body.name) b.name = body.name;
      if (b.recurringRuleId) b.recurringEdited = true;
      return r.fulfill({ json: { message: 'ok', task: b } });
    }
    return r.fallback();
  });
  await page.route('**/api/tasks/*/occurrence', r => {
    const id = Number(new URL(r.request().url()).pathname.split('/')[3]);
    const b = state.blocks.find(x => x.id === id)!;
    state.blocks = state.blocks.filter(x => x.id !== id);
    state.exceptions.push({ ruleId: b.recurringRuleId!, date: b.originalDate ?? b.date, reason: 'cancelled' });
    return r.fulfill({ status: 204, body: '' });
  });
  return state;
}

async function signIn(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#password').fill('correct horse battery');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() => localStorage.setItem('locale', 'en'));
}

async function openPlanner(page: Page) {
  await page.goto('/planner');
  await expect(page.getByRole('heading', { name: 'Planner', level: 1 })).toBeVisible();
  await page.getByRole('group', { name: 'Planner view' }).getByRole('button', { name: 'Week' }).click();
}

/** Desktop: one click to next week. Phone: one day at a time, to next Monday. */
async function goToNextWeek(page: Page, mobile: boolean) {
  if (!mobile) return page.getByRole('button', { name: 'Next week' }).click();
  for (let i = 0; i < 8 - iso(today); i++) await page.getByRole('button', { name: 'Next day' }).click();
}

async function showDay(page: Page, mobile: boolean, date: string) {
  if (mobile) await page.getByRole('group', { name: 'Week' }).getByRole('button', { name: new RegExp(`^${DAY_NAMES[iso(date) - 1]}`) }).click();
}

const column = (page: Page, date: string) => page.getByRole('group', { name: new RegExp(`^Plan for ${DAY_NAMES[iso(date) - 1]}`) });

async function fillForm(page: Page, f: { name: string; category: string; date: string; start: string; end: string; weekdays?: number[] }) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Task').fill(f.name);
  await dialog.getByLabel('Category').selectOption({ label: f.category });
  await dialog.getByLabel(f.weekdays ? 'From' : 'Date').fill(f.date);
  await dialog.getByLabel('Start').selectOption({ label: f.start });
  await dialog.getByLabel('End').selectOption({ label: f.end });
  if (f.weekdays) {
    for (let d = 1; d <= 7; d++) {
      const toggle = dialog.getByRole('button', { name: DAY_NAMES[d - 1], exact: true });
      if ((await toggle.getAttribute('aria-pressed') === 'true') !== f.weekdays.includes(d)) await toggle.click();
    }
  }
}

test('plans a timetable, gym 3×/week and four focus blocks in one pass', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-390';
  const errors: string[] = [];
  // A failed request is reported by its URL (the console only says "Failed to load resource").
  page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  page.on('pageerror', e => errors.push(String(e)));
  const state = await mockPlannerApi(page);
  await signIn(page);
  await openPlanner(page);
  errors.length = 0; // count from the planner on: the home screen after sign-in reads APIs this spec does not mock
  await expect(page.getByText('Nothing planned yet')).toBeVisible();
  await screen(page, info, 'f13-empty');
  await goToNextWeek(page, mobile);

  // The timetable, by keyboard only: open the form with Enter and type into every field.
  await page.getByRole('button', { name: 'Add a repeating block' }).first().focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Task')).toBeFocused();
  await page.keyboard.type('Lectures');
  await fillForm(page, { name: 'Lectures', category: 'Study', date: nextMonday, start: '09:00', end: '12:00', weekdays: [1, 3, 5] });
  await screen(page, info, 'f13-form-repeating');
  await dialog.getByRole('button', { name: 'Save' }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('planner-announcer')).toHaveText('Repeating block saved');

  await page.getByRole('button', { name: 'Add a repeating block' }).first().click();
  await fillForm(page, { name: 'Gym', category: 'Gym', date: nextMonday, start: '18:00', end: '19:30', weekdays: [1, 3, 5] });
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();

  for (const [i, [day, start, end]] of ([[1, '09:00', '11:00'], [1, '14:00', '16:00'], [3, '09:00', '11:00'], [3, '14:00', '16:00']] as const).entries()) {
    await page.getByRole('button', { name: 'Add a block' }).first().click();
    await fillForm(page, { name: `Focus ${i + 1}`, category: 'Deep Work', date: addDays(nextMonday, day), start, end });
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
  }
  expect(state.rules.map(r => [r.name, r.weekdays.join(''), r.startMin, r.endMin])).toEqual([['Lectures', '135', 540, 720], ['Gym', '135', 1080, 1170]]);

  // The server planned 3 + 3 occurrences; with the 4 focus blocks that is 10 blocks next week.
  const wed = addDays(nextMonday, 2);
  if (!mobile) {
    await expect(page.locator('[data-block-id]')).toHaveCount(10);
  } else {
    await showDay(page, mobile, wed);
    await expect(column(page, wed).locator('[data-block-id]')).toHaveCount(2);
  }
  await expect(column(page, wed).getByRole('button', { name: /^Gym, 18:00–19:30/ })).toBeVisible();
  await screen(page, info, 'f13-week');

  // Wednesday's gym, "only this one", to 19:00–20:30.
  await showDay(page, mobile, wed);
  await column(page, wed).getByRole('button', { name: /^Gym, 18:00–19:30/ }).click();
  await expect(dialog.getByRole('radio', { name: 'Only this one' })).toBeChecked();
  await dialog.getByLabel('Start').selectOption({ label: '19:00' });
  await dialog.getByLabel('End').selectOption({ label: '20:30' });
  await screen(page, info, 'f13-form-occurrence');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(column(page, wed).getByRole('button', { name: /^Gym, 19:00–20:30/ })).toBeVisible();
  const gymWed = state.blocks.find(b => b.date === wed && b.name === 'Gym')!;
  expect(gymWed.recurringEdited).toBe(true);

  // Cancel Friday's gym: a quiet "not this week", no block, nothing counted as missed.
  const fri = addDays(nextMonday, 4);
  await showDay(page, mobile, fri);
  await column(page, fri).getByRole('button', { name: /^Gym, 18:00–19:30/ }).click();
  await dialog.getByRole('button', { name: 'Delete just this one' }).click();
  await expect(column(page, fri).getByText('Gym: not this week')).toBeVisible();
  await expect(column(page, fri).getByRole('button', { name: /^Gym,/ })).toHaveCount(0);
  expect(state.exceptions).toContainEqual({ ruleId: state.rules[1].id, date: fri, reason: 'cancelled' });
  await expect(page.locator('main')).not.toContainText(/missed|failed/i);

  // Move "Focus 1" (Tuesday 09:00–11:00) one hour later by drag / long press.
  const tue = addDays(nextMonday, 1);
  await showDay(page, mobile, tue);
  const focus = column(page, tue).getByRole('button', { name: /^Focus 1, 09:00–11:00/ });
  await focus.scrollIntoViewIfNeeded();
  const box = (await focus.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + 15;
  if (!mobile) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(x, y + i * 8); // 48 px = 1 h at 0.8 px/min
    await page.mouse.up();
  } else {
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', ty?: number) => cdp.send('Input.dispatchTouchEvent', {
      type, touchPoints: ty === undefined ? [] : [{ x, y: ty, id: 1 }] });
    await touch('touchStart', y);
    await page.waitForTimeout(550); // ≥ 400 ms picks it up
    for (let i = 1; i <= 6; i++) await touch('touchMove', y + i * 12); // 72 px = 1 h at 1.2 px/min
    await touch('touchEnd');
    await expect(column(page, tue).getByRole('button', { name: /^Focus 1, 10:00–12:00/ })).toBeVisible();
    // A quick swipe on a block scrolls the day and moves nothing.
    const puts = state.puts.length;
    const moved = (await column(page, tue).getByRole('button', { name: /^Focus 1, 10:00–12:00/ }).boundingBox())!;
    await touch('touchStart', moved.y + 15);
    await touch('touchMove', moved.y + 55);
    await touch('touchEnd');
    await page.waitForTimeout(300);
    expect(state.puts.length).toBe(puts);
  }
  await expect(column(page, tue).getByRole('button', { name: /^Focus 1, 10:00–12:00/ })).toBeVisible();
  expect(state.puts.at(-1)!.body).toMatchObject({ date: tue, startTime: '10:00', endTime: '12:00' });
  await expect(page.getByTestId('planner-announcer')).toContainText('10:00–12:00');

  await page.getByRole('group', { name: 'Planner view' }).getByRole('button', { name: 'Day' }).click();
  await expect(page.locator('[data-block-id]').first()).toBeVisible();
  await screen(page, info, 'f13-day');

  await page.getByRole('button', { name: 'Categories' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Deep Work/ })).toBeVisible();
  await screen(page, info, 'f13-categories');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await expectNoSidewaysOverflow(page, 'on the planner');
  if (mobile) await expectTouchTargets(page, 'on the planner');
  expect(errors).toEqual([]);
});

test('offline: shows the last loaded week read-only and plans nothing', async ({ page, context }, info) => {
  const state = await mockPlannerApi(page);
  await signIn(page);
  await openPlanner(page);
  await expect(page.getByText('Nothing planned yet')).toBeVisible();
  const reads = state.rangeReads;
  await context.setOffline(true);
  await expect(page.getByText(/Offline — showing the week you last loaded/)).toBeVisible();
  await screen(page, info, 'f13-offline');
  await page.getByRole('button', { name: /^Next/ }).click();
  await page.getByRole('button', { name: /^Previous/ }).click();
  expect(state.rangeReads).toBe(reads);
  await context.setOffline(false);
});
