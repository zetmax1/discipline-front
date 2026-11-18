import { describe, it, expect } from 'vitest';
import { breakFor, breakSuggestion, clockOffset, PRESETS, remainingSeconds, formatCountdown } from './focus';

const session = { startedAt: '2026-10-30T04:00:00Z', plannedMinutes: 25 };

describe('countdown', () => {
  it('is the same on two devices whose clocks disagree', () => {
    const serverNow = Date.parse('2026-10-30T04:10:00Z');
    // Phone clock is 7 s ahead, laptop 40 s behind; both read the server time at the same moment.
    const phone = clockOffset(serverNow, serverNow + 7_000);
    const laptop = clockOffset(serverNow, serverNow - 40_000);
    const later = 2_500; // 2.5 s after the response, on each device's own clock
    const a = remainingSeconds(session, serverNow + 7_000 + later, phone);
    const b = remainingSeconds(session, serverNow - 40_000 + later, laptop);
    expect(a).toBe(b);
    expect(a).toBe(15 * 60 - 3); // 14:57.5 left -> 897 whole seconds
  });

  it('never goes below zero and formats as mm:ss', () => {
    expect(remainingSeconds(session, Date.parse('2026-10-30T05:00:00Z'), 0)).toBe(0);
    expect(formatCountdown(897)).toBe('14:57');
    expect(formatCountdown(5400)).toBe('90:00');
  });
});

describe('breaks', () => {
  it('uses the preset break, and a long break after every 4th completed session', () => {
    const p = PRESETS[0];
    expect([p.focus, p.break, p.longBreak]).toEqual([25, 5, 15]);
    expect(breakFor(p, 1)).toBe(5);
    expect(breakFor(p, 4)).toBe(15);
    expect(breakFor(p, 8)).toBe(15);
    expect(breakFor({ focus: 40, break: 8, longBreak: 20 }, 3)).toBe(8);
  });

  it('rotates the break suggestions', () => {
    expect(breakSuggestion(0)).toBe('breaks.walk');
    expect(breakSuggestion(4)).toBe(breakSuggestion(0));
    expect(new Set([0, 1, 2, 3].map(breakSuggestion)).size).toBe(4);
  });
});
