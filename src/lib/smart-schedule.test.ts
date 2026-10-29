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
