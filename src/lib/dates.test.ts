// Run the whole file in Tashkent (UTC+5) so UTC and local dates differ after midnight.
process.env.TZ = 'Asia/Tashkent';

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { localDateString, weeklyPlanDate } from './dates';

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

describe('weeklyPlanDate', () => {
  it('maps weekday names to the next local dates starting tomorrow', () => {
    // From Thursday 2026-10-29 00:30 local: tomorrow is Friday the 30th.
    expect(weeklyPlanDate('Friday', HALF_PAST_MIDNIGHT_TASHKENT)).toBe('2026-10-30');
    expect(weeklyPlanDate('Saturday', HALF_PAST_MIDNIGHT_TASHKENT)).toBe('2026-10-31');
    expect(weeklyPlanDate('Monday', HALF_PAST_MIDNIGHT_TASHKENT)).toBe('2026-11-02');
    expect(weeklyPlanDate('Thursday', HALF_PAST_MIDNIGHT_TASHKENT)).toBe('2026-11-05');
  });

  it('rejects unknown day names', () => {
    expect(() => weeklyPlanDate('Funday', HALF_PAST_MIDNIGHT_TASHKENT)).toThrow();
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
