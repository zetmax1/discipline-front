import { describe, it, expect, beforeEach } from 'vitest';
import {
  addDays, clockLabel, dayLoad, isoWeekday, layoutLanes, loadWeekCache, mondayOf, moveWithin, pressDecision,
  resizeEnd, saveWeekCache, snap, weekDates, categoryLabel, LONG_PRESS_MS,
} from './planner';

describe('15-minute grid', () => {
  it('snaps to 15 minutes inside the day', () => {
    expect(snap(547)).toBe(540);
    expect(snap(553)).toBe(555);
    expect(snap(-20)).toBe(0);
    expect(snap(1500)).toBe(1440);
  });
  it('moves a block keeping its length and never past midnight', () => {
    expect(moveWithin({ startMin: 540, endMin: 600 }, 997)).toEqual({ startMin: 990, endMin: 1050 });
    expect(moveWithin({ startMin: 540, endMin: 600 }, 1420)).toEqual({ startMin: 1380, endMin: 1440 });
    expect(moveWithin({ startMin: 540, endMin: 600 }, -30)).toEqual({ startMin: 0, endMin: 60 });
  });
  it('resizes in steps and keeps at least 15 minutes', () => {
    expect(resizeEnd({ startMin: 540, endMin: 600 }, 668)).toBe(675);
    expect(resizeEnd({ startMin: 540, endMin: 600 }, 500)).toBe(555);
    expect(resizeEnd({ startMin: 540, endMin: 600 }, 1600)).toBe(1440);
  });
  it('labels minutes as HH:MM, 1440 as 24:00', () => {
    expect(clockLabel(545)).toBe('09:05');
    expect(clockLabel(1440)).toBe('24:00');
  });
});

describe('weeks', () => {
  it('starts on Monday, also from a Sunday, and uses ISO weekdays', () => {
    expect(mondayOf('2026-11-08')).toBe('2026-11-02'); // Sunday
    expect(mondayOf('2026-11-02')).toBe('2026-11-02');
    expect(weekDates('2026-11-02')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
    expect(isoWeekday('2026-11-08')).toBe(7);
    expect(isoWeekday('2026-11-02')).toBe(1);
  });
  it('adds days across a DST change and month ends by calendar date', () => {
    expect(addDays('2027-03-13', 1)).toBe('2027-03-14');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('long press', () => {
  it('a quick swipe scrolls, a still press of 400 ms picks the block up', () => {
    expect(LONG_PRESS_MS).toBe(400);
    expect(pressDecision(120, 30)).toBe('scroll');
    expect(pressDecision(399, 2)).toBe('wait');
    expect(pressDecision(400, 4)).toBe('pick');
    expect(pressDecision(800, 40)).toBe('scroll');
  });
});

describe('layout', () => {
  it('puts overlapping blocks (placed anyway) side by side', () => {
    const lanes = layoutLanes([
      { id: 1, startMin: 540, endMin: 600 }, { id: 2, startMin: 570, endMin: 630 }, { id: 3, startMin: 630, endMin: 660 },
    ]);
    expect(lanes.get(1)).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get(2)).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get(3)).toEqual({ lane: 0, lanes: 1 });
  });
  it('rates how full a day is with up to three dots', () => {
    expect(dayLoad([])).toBe(0);
    expect(dayLoad([{ startMin: 540, endMin: 600 }])).toBe(1);
    expect(dayLoad([{ startMin: 0, endMin: 200 }, { startMin: 300, endMin: 400 }])).toBe(2);
    expect(dayLoad([{ startMin: 0, endMin: 400 }])).toBe(3);
  });
});

describe('category names', () => {
  const t = (k: string) => `T(${k})`; // stands in for useI18n().t
  it('translates a default until it is renamed', () => {
    expect(categoryLabel({ name: 'Gym', systemKey: 'exercise', nameCustom: false }, t)).toBe('T(categories.exercise)');
    expect(categoryLabel({ name: 'Workout', systemKey: 'exercise', nameCustom: true }, t)).toBe('Workout');
    expect(categoryLabel({ name: 'Reading', systemKey: null, nameCustom: false }, t)).toBe('Reading');
  });
});

describe('offline week cache', () => {
  beforeEach(() => localStorage.clear());
  it('keeps the last fetched week, with its truncated and conflict markers', () => {
    const range = { tasks: [], exceptions: [{ ruleId: 1, date: '2026-11-04', reason: 'conflict' as const }], truncated: true };
    saveWeekCache('2026-11-02', range);
    expect(loadWeekCache('2026-11-02')).toEqual(range);
    expect(loadWeekCache('2026-11-09')).toBeUndefined();
    localStorage.setItem('planner-week:2026-11-09', '{broken');
    expect(loadWeekCache('2026-11-09')).toBeUndefined();
  });
});
