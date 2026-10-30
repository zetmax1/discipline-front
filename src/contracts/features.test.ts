import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportContract, FeaturesResponse } from './features';

const CONTRACT_FILE = join(__dirname, '..', '..', 'contracts', 'features.schema.json');

describe('features contract file', () => {
  it('matches the zod schema the UI parses with (run `npm run contract:update` after changing it)', () => {
    const fresh = JSON.stringify(exportContract(), null, 2) + '\n';
    if (process.env.UPDATE_CONTRACT === '1') writeFileSync(CONTRACT_FILE, fresh);
    expect(existsSync(CONTRACT_FILE)).toBe(true);
    expect(readFileSync(CONTRACT_FILE, 'utf8')).toBe(fresh);
  });
});

describe('FeaturesResponse', () => {
  it('accepts feature ids and an empty list', () => {
    expect(FeaturesResponse.parse({ features: ['F1', 'F12A', 'F9B'] }).features).toEqual(['F1', 'F12A', 'F9B']);
    expect(FeaturesResponse.parse({ features: [] }).features).toEqual([]);
  });

  it('rejects a missing list, null and strings that are not ids', () => {
    expect(FeaturesResponse.safeParse({}).success).toBe(false);
    expect(FeaturesResponse.safeParse({ features: null }).success).toBe(false);
    expect(FeaturesResponse.safeParse({ features: ['FEATURE_F1'] }).success).toBe(false);
    expect(FeaturesResponse.safeParse({ features: ['f1'] }).success).toBe(false);
  });
});
