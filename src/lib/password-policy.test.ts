import { describe, it, expect } from 'vitest';
import { passwordPolicyError } from './password-policy';

describe('passwordPolicyError', () => {
  it('rejects fewer than 10 characters', () => {
    expect(passwordPolicyError('123456789')).toMatch(/at least 10/);
  });

  it('accepts 10 characters', () => {
    expect(passwordPolicyError('1234567890')).toBeNull();
  });

  it('counts characters, not bytes, for the minimum', () => {
    expect(passwordPolicyError('é'.repeat(10))).toBeNull();
  });

  it('rejects more than 72 bytes', () => {
    expect(passwordPolicyError('a'.repeat(73))).toMatch(/72/);
    expect(passwordPolicyError('é'.repeat(37))).toMatch(/72/); // 74 bytes
  });

  it('accepts exactly 72 bytes', () => {
    expect(passwordPolicyError('a'.repeat(72))).toBeNull();
  });
});
