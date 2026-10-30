import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportContract, ErrorResponse, ERROR_CODES } from './errors';

const CONTRACT_FILE = join(__dirname, '..', '..', 'contracts', 'errors.schema.json');

describe('errors contract file', () => {
  it('matches the zod schema (run `npm run contract:update` after changing it)', () => {
    const fresh = JSON.stringify(exportContract(), null, 2) + '\n';
    if (process.env.UPDATE_CONTRACT === '1') writeFileSync(CONTRACT_FILE, fresh);
    expect(existsSync(CONTRACT_FILE)).toBe(true);
    expect(readFileSync(CONTRACT_FILE, 'utf8')).toBe(fresh);
  });
});

describe('ErrorResponse', () => {
  it('accepts a known code with extra fields', () => {
    const e = ErrorResponse.parse({ error: 'invalid email or password', code: 'invalid_credentials', captchaRequired: true });
    expect(e.code).toBe('invalid_credentials');
  });

  it('rejects an unknown code or a missing text', () => {
    expect(ErrorResponse.safeParse({ error: 'x', code: 'made_up' }).success).toBe(false);
    expect(ErrorResponse.safeParse({ code: 'internal_error' }).success).toBe(false);
  });

  it('lists each code once', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });
});
