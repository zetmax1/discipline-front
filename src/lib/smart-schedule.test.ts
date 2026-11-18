import { describe, it, expect } from 'vitest';
import { shortfallMessages } from './smart-schedule';

describe('shortfallMessages', () => {
  it('lists each category that could not be fully placed', () => {
    expect(shortfallMessages({ 'deep-work': 600, study: 0, rest: 90 })).toEqual([
      'Could not fit 10 h of Deep Work.',
      'Could not fit 1.5 h of Rest.',
    ]);
  });
  it('is empty when everything fit', () => {
    expect(shortfallMessages({ 'deep-work': 0, study: 0, rest: 0 })).toEqual([]);
  });
});

import { formatDays, WEEKDAYS } from './smart-schedule';

describe('formatDays', () => {
  it('summarises common sets and lists the rest in week order', () => {
    expect(formatDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).toBe('Every day');
    expect(formatDays(WEEKDAYS)).toBe('Mon–Fri');
    expect(formatDays(['Sunday', 'Saturday'])).toBe('Sat–Sun');
    expect(formatDays(['Friday', 'Monday', 'Wednesday'])).toBe('Mon, Wed, Fri');
    expect(formatDays([])).toBe('No days');
  });
});

describe('in other languages', () => {
  it('uses local weekday names and category labels', () => {
    expect(formatDays(WEEKDAYS, 'ru')).toBe('пн–пт');
    expect(formatDays([], 'uz')).toBe('Kun tanlanmagan');
    expect(shortfallMessages({ 'deep-work': 90 }, 'ru')).toEqual(['Не поместилось 1,5 ч: Глубокая работа.']);
  });
});
