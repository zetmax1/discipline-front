import { describe, it, expect } from 'vitest';
import { isStoredWord } from './vocabulary';

describe('isStoredWord', () => {
  it('treats id 0 (unsaved fallback from the server) as not stored', () => {
    expect(isStoredWord({ id: 0 })).toBe(false);
  });
  it('treats real ids as stored', () => {
    expect(isStoredWord({ id: 12 })).toBe(true);
    expect(isStoredWord({ id: 'local-1' })).toBe(true); // demo-mode ids
  });
});
