import { describe, it, expect } from 'vitest';
import { formatScore, formatPercent, formatHours, patternsMessage, patternInsights } from './analytics-format';

describe('analytics formatting', () => {
  it('shows an em dash for null, never 0', () => {
    expect(formatScore(null)).toBe('—');
    expect(formatPercent(null)).toBe('—');
    expect(formatScore(0)).toBe('0');
    expect(formatPercent(0)).toBe('0%');
  });

  it('formats values', () => {
    expect(formatScore(80.5)).toBe('80.5');
    expect(formatPercent(0.875)).toBe('88%');
    expect(formatHours(90)).toBe('1.5h');
    expect(formatHours(0)).toBe('0h');
  });

  it('asks for the missing days when data is insufficient', () => {
    expect(patternsMessage({ insufficient_data: true, days_needed: 4 })).toBe('Log 4 more days to see patterns.');
    expect(patternsMessage({ insufficient_data: true, days_needed: 1 })).toBe('Log 1 more day to see patterns.');
    expect(patternsMessage({ insufficient_data: false })).toBeNull();
  });
});

describe('in other languages', () => {
  it('formats hours, percents and plural day counts', () => {
    expect(formatHours(90, 'ru')).toBe('1,5 ч');
    expect(formatHours(120, 'uz')).toBe('2 soat');
    expect(formatPercent(0.5, 'ru')).toBe('50\u00a0%');
    expect(patternsMessage({ insufficient_data: true, days_needed: 2 }, 'ru')).toBe('Отметьте ещё 2 дня, чтобы увидеть закономерности.');
    expect(patternsMessage({ insufficient_data: true, days_needed: 5 }, 'ru')).toBe('Отметьте ещё 5 дней, чтобы увидеть закономерности.');
  });
});

describe('patternInsights', () => {
  const found = {
    insufficient_data: false as const, days_with_data: 9, window_days: 30, best_weekday: 'Monday', peak_hour: 9,
    trend: 'stable' as const, consistency_score: 80, insights: ['Your best day is Monday, with an average focus score of 90.'],
  };

  it('keeps the server text in English', () => {
    expect(patternInsights(found, 'en')).toEqual(found.insights);
  });

  it('builds the lines from the data in other languages', () => {
    expect(patternInsights(found, 'ru')).toEqual([
      'Ваш лучший день — понедельник.',
      'Чаще всего вы глубоко работаете около 09:00.',
      'Ваш дневной фокус стабилен.',
      'Стабильность выполнения: 80/100.',
    ]);
    expect(patternInsights({ ...found, peak_hour: null, trend: 'declining' as const }, 'uz')).toEqual([
      'Eng yaxshi kuningiz — dushanba.',
      'Soʻnggi kunlarda diqqat balli pastroq — yengilroq hafta yoki koʻproq dam yordam beradi.',
      'Bajarilish barqarorligi: 80/100.',
    ]);
  });
});
