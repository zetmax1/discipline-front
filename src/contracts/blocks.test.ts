import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportContract, Block } from './blocks';

const CONTRACT_FILE = join(__dirname, '..', '..', 'contracts', 'blocks.schema.json');

describe('blocks contract file', () => {
  it('matches the zod schemas (run `npm run contract:update` after changing them)', () => {
    const fresh = JSON.stringify(exportContract(), null, 2) + '\n';
    if (process.env.UPDATE_CONTRACT === '1') writeFileSync(CONTRACT_FILE, fresh);
    expect(existsSync(CONTRACT_FILE)).toBe(true);
    expect(readFileSync(CONTRACT_FILE, 'utf8')).toBe(fresh);
  });
});

describe('Block', () => {
  const block = {
    id: 1, name: 'A', category: 'study', date: '2026-10-29', startMin: 540, endMin: 1440, startTime: '09:00',
    endTime: '24:00', status: 'planned', distractions: 0, energy: 3, actualStartMin: null, actualEndMin: null,
    focusRating: null, note: null, movedFromId: null,
  };
  it('accepts the lifecycle fields and rejects legacy statuses or minutes past 24:00', () => {
    expect(Block.parse(block).endMin).toBe(1440);
    expect(Block.safeParse({ ...block, status: 'pending' }).success).toBe(false);
    expect(Block.safeParse({ ...block, endMin: 1441 }).success).toBe(false);
  });
});
