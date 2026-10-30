// Run the whole file in Tashkent (UTC+5) so UTC and local dates differ after midnight.
process.env.TZ = 'Asia/Tashkent';

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { localDateString, planDateFor, weekOptions } from './dates';

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
