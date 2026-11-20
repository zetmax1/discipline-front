// Run the whole file in Tashkent (UTC+5) so UTC and local dates differ after midnight.
process.env.TZ = 'Asia/Tashkent';

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { localDateString, planDateFor, weekOptions, zonedDateString, zonedMinuteOfDay } from './dates';

// 2026-10-28T19:30Z is Thursday 2026-10-29 00:30 in Tashkent.
const HALF_PAST_MIDNIGHT_TASHKENT = new Date('2026-10-28T19:30:00Z');

describe('localDateString', () => {
  it('uses the local calendar date at 00:30 Tashkent', () => {
    expect(localDateString(HALF_PAST_MIDNIGHT_TASHKENT)).toBe('2026-10-29');
    // the bug it replaces:
    expect(HALF_PAST_MIDNIGHT_TASHKENT.toISOString().split('T')[0]).toBe('2026-10-28');
  });

  it('formats as yyyy-MM-dd', () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('weekOptions', () => {
  it('offers this week and the next four, defaulting to next Mon–Sun', () => {
    const opts = weekOptions(HALF_PAST_MIDNIGHT_TASHKENT); // Thursday 2026-10-29 local
    expect(opts.map(o => o.weekStart)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23']);
    expect(opts.find(o => o.isDefault)?.weekStart).toBe('2026-11-02');
    expect(opts[1].label).toBe('Next week (Nov 2 – Nov 8)');
  });

  it('treats Sunday as the end of its week', () => {
    const sunday = new Date(2026, 10, 1, 23, 0); // Sun 2026-11-01 local
    expect(weekOptions(sunday)[0].weekStart).toBe('2026-10-26');
    expect(weekOptions(sunday).find(o => o.isDefault)?.weekStart).toBe('2026-11-02');
  });
});

describe('planDateFor', () => {
  it('maps weekday names into the chosen week', () => {
    expect(planDateFor('Monday', '2026-11-02')).toBe('2026-11-02');
    expect(planDateFor('Sunday', '2026-11-02')).toBe('2026-11-08');
    expect(() => planDateFor('Funday', '2026-11-02')).toThrow();
  });
});

describe('no UTC date slicing left in the app', () => {
  it("does not use toISOString().split('T')[0] anywhere in src", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts')) {
          if (/toISOString\(\)\.split\(['"]T['"]\)\[0\]/.test(readFileSync(path, 'utf8'))) offenders.push(path);
        }
      }
    };
    walk(join(__dirname, '..'));
    expect(offenders).toEqual([]);
  });
});

describe('weekOptions labels', () => {
  it('are written in the chosen language', () => {
    const opts = weekOptions(new Date(2026, 9, 29, 0, 30), 2, 'ru');
    expect(opts[0].label).toMatch(/^Эта неделя \(26 окт\.? – 1 нояб\.?\)$/);
  });
});

describe('the user\'s zone, not the device\'s (F13 review M4)', () => {
  it('crosses midnight in the user\'s IANA zone', () => {
    const at = new Date('2026-11-08T19:30:00Z'); // 00:30 on Monday in Tashkent (UTC+5)
    expect(zonedDateString(at, 'Asia/Tashkent')).toBe('2026-11-09');
    expect(zonedMinuteOfDay(at, 'Asia/Tashkent')).toBe(30);
    expect(zonedDateString(at, 'UTC')).toBe('2026-11-08');
    expect(zonedMinuteOfDay(at, 'UTC')).toBe(19 * 60 + 30);
  });

  it('follows a DST change (New York falls back on 2026-11-01)', () => {
    expect(zonedMinuteOfDay(new Date('2026-11-01T05:30:00Z'), 'America/New_York')).toBe(90); // 01:30 EDT
    expect(zonedMinuteOfDay(new Date('2026-11-01T06:30:00Z'), 'America/New_York')).toBe(90); // 01:30 EST
    expect(zonedDateString(new Date('2026-11-01T04:30:00Z'), 'America/New_York')).toBe('2026-11-01');
  });

  it('falls back to the device zone when the zone is missing or unknown', () => {
    const at = new Date(2026, 10, 9, 23, 45);
    for (const tz of [undefined, '', 'Not/AZone']) {
      expect(zonedDateString(at, tz)).toBe('2026-11-09');
      expect(zonedMinuteOfDay(at, tz)).toBe(23 * 60 + 45);
    }
  });
});
