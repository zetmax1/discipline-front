import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportContract } from './recurring';

const CONTRACT_FILE = join(__dirname, '..', '..', 'contracts', 'recurring.schema.json');

describe('recurring contract file', () => {
  it('matches the zod schemas (run `npm run contract:update` after changing them)', () => {
    const fresh = JSON.stringify(exportContract(), null, 2) + '\n';
    if (process.env.UPDATE_CONTRACT === '1') writeFileSync(CONTRACT_FILE, fresh);
    expect(existsSync(CONTRACT_FILE)).toBe(true);
    expect(readFileSync(CONTRACT_FILE, 'utf8')).toBe(fresh);
  });
});
