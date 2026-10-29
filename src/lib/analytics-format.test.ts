import { describe, it, expect } from 'vitest';
import { formatScore, formatPercent, formatHours, patternsMessage } from './analytics-format';

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
