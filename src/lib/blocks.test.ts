import { describe, it, expect } from 'vitest';
import { isOpen, normalizeStatus, visibleBlocks } from './blocks';

describe('block helpers', () => {
  it('reads the legacy status names saved by demo mode', () => {
    expect(normalizeStatus('pending')).toBe('planned');
    expect(normalizeStatus('completed')).toBe('done');
    expect(normalizeStatus('partial')).toBe('partial');
  });

  it('treats planned and in-progress blocks as open', () => {
    expect(isOpen('planned') && isOpen('in_progress')).toBe(true);
    expect(isOpen('done') || isOpen('partial') || isOpen('skipped') || isOpen('moved')).toBe(false);
  });

  it('hides moved blocks (their replacement is shown)', () => {
    const b = (id: string, status: string) => ({ id, status }) as never;
    expect(visibleBlocks([b('1', 'moved'), b('2', 'planned')]).map((x: { id: string }) => x.id)).toEqual(['2']);
  });
});
