/**
 * Planner v2 (F13) logic without React: the 15-minute grid, weeks (Monday first, ISO weekdays),
 * the long-press rule for touch, lanes for overlapping blocks and the offline week cache.
 * Dates are local "YYYY-MM-DD" strings, computed as calendar dates (DST never shifts them).
 */
import { BlockRange } from '@/contracts/recurring';
import type { TKey } from '@/i18n/translate';

export const STEP_MIN = 15;
/** The server plans recurring blocks at most this many days after today (8 weeks). */
export const PLAN_AHEAD_DAYS = 56;
export const DAY_MIN = 1440;
/** Touch: a press held this long without moving picks a block up; moving first scrolls. */
export const LONG_PRESS_MS = 400;
/** Movement (px) a press may wobble before it counts as a swipe. */
export const PRESS_SLOP_PX = 10;

export interface Span { startMin: number; endMin: number }

export function snap(min: number): number {
  return Math.min(DAY_MIN, Math.max(0, Math.round(min / STEP_MIN) * STEP_MIN));
}

/** The block's span starting at `startMin` (snapped), same length, kept inside the day. */
export function moveWithin(span: Span, startMin: number): Span {
  const length = span.endMin - span.startMin;
  const start = Math.min(DAY_MIN - length, Math.max(0, snap(startMin)));
  return { startMin: start, endMin: start + length };
}

/** A new end (snapped), at least one step after the start, at most 24:00. */
export function resizeEnd(span: Span, endMin: number): number {
  return Math.min(DAY_MIN, Math.max(span.startMin + STEP_MIN, snap(endMin)));
}

export function clockLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** Every 15-minute step from 00:00 to 24:00, for the form's start/end selects. */
export const STEPS = Array.from({ length: DAY_MIN / STEP_MIN + 1 }, (_, i) => i * STEP_MIN);

export function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function format(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(date: string, n: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + n);
  return format(d);
}

/** ISO weekday: Monday = 1 … Sunday = 7 (Date#getDay has Sunday = 0). */
export function isoWeekday(date: string): number {
  return ((parseDate(date).getDay() + 6) % 7) + 1;
}

export function mondayOf(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** What a touch press is doing after `elapsedMs` with the finger `movedPx` from where it began. */
export function pressDecision(elapsedMs: number, movedPx: number): 'scroll' | 'wait' | 'pick' {
  if (movedPx > PRESS_SLOP_PX) return 'scroll';
  return elapsedMs >= LONG_PRESS_MS ? 'pick' : 'wait';
}

/** Side-by-side lanes for blocks that overlap (an occurrence placed anyway): id → lane of lanes. */
export function layoutLanes<T extends Span & { id: number | string }>(blocks: T[]): Map<T['id'], { lane: number; lanes: number }> {
  const out = new Map<T['id'], { lane: number; lanes: number }>();
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  let group: { block: T; lane: number }[] = [];
  let groupEnd = -1;
  const close = () => {
    const lanes = Math.max(1, ...group.map(g => g.lane + 1));
    for (const g of group) out.set(g.block.id, { lane: g.lane, lanes });
    group = [];
  };
  for (const block of sorted) {
    if (block.startMin >= groupEnd && group.length) close();
    const busy = new Set(group.filter(g => g.block.endMin > block.startMin).map(g => g.lane));
    let lane = 0;
    while (busy.has(lane)) lane++;
    group.push({ block, lane });
    groupEnd = Math.max(groupEnd, block.endMin);
  }
  if (group.length) close();
  return out;
}

/** 0–3 dots for how full a day is (planned minutes). */
export function dayLoad(blocks: Span[]): 0 | 1 | 2 | 3 {
  const minutes = blocks.reduce((sum, b) => sum + Math.max(0, b.endMin - b.startMin), 0);
  if (minutes === 0) return 0;
  if (minutes < 180) return 1;
  if (minutes < 360) return 2;
  return 3;
}

/** A default shows its translated name until the user renames it. */
export function categoryLabel(c: { name: string; systemKey?: string | null; nameCustom: boolean }, t: (key: TKey) => string): string {
  return c.nameCustom || !c.systemKey ? c.name : t(`categories.${c.systemKey}` as TKey);
}

const CACHE_PREFIX = 'planner-week:';

/** Keeps the last fetched week so the planner still shows it offline. */
export function saveWeekCache(monday: string, range: BlockRange) {
  try {
    localStorage.setItem(CACHE_PREFIX + monday, JSON.stringify(range));
  } catch {
    // Storage full or blocked: offline shows nothing cached.
  }
}

export function loadWeekCache(monday: string): BlockRange | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + monday);
    if (!raw) return undefined;
    const parsed = BlockRange.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
