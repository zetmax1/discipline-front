import { describe, it, expect } from 'vitest';
import { buildProfileUpdate } from './profile-update';

describe('buildProfileUpdate', () => {
  const current = { name: 'Ann', email: 'ann@example.com' };
  const empty = { name: 'Ann', email: 'ann@example.com', oldPassword: '', newPassword: '' };

  it('returns an empty body when nothing changed', () => {
    expect(buildProfileUpdate(current, empty)).toEqual({ body: {} });
  });

  it('sends a name change without a password', () => {
    expect(buildProfileUpdate(current, { ...empty, name: 'Annie' })).toEqual({ body: { name: 'Annie' } });
  });

  it('requires the current password to change email', () => {
    const result = buildProfileUpdate(current, { ...empty, email: 'new@example.com' });
    expect(result.error).toMatch(/current password/i);
    expect(result.body).toBeUndefined();
  });

  it('sends oldPassword with an email change', () => {
    expect(buildProfileUpdate(current, { ...empty, email: 'new@example.com', oldPassword: 'secret-pass' })).toEqual({
      body: { email: 'new@example.com', oldPassword: 'secret-pass' },
    });
  });

  it('requires the current password to change password', () => {
    const result = buildProfileUpdate(current, { ...empty, newPassword: 'new-long-password' });
    expect(result.error).toMatch(/current password/i);
  });

  it('applies the password policy to a new password', () => {
    const result = buildProfileUpdate(current, { ...empty, oldPassword: 'secret-pass', newPassword: 'short' });
    expect(result.error).toMatch(/at least 10/);
  });

  it('sends oldPassword once when changing email and password together', () => {
    expect(
      buildProfileUpdate(current, {
        ...empty,
        email: 'new@example.com',
        oldPassword: 'secret-pass',
        newPassword: 'new-long-password',
      }),
    ).toEqual({
      body: { email: 'new@example.com', oldPassword: 'secret-pass', newPassword: 'new-long-password' },
    });
  });
});

describe('buildProfileUpdate timezone', () => {
  const current = { name: 'Ann', email: 'ann@example.com', timezone: 'Asia/Tashkent' };
  const form = { name: 'Ann', email: 'ann@example.com', oldPassword: '', newPassword: '', timezone: 'Asia/Tashkent' };

  it('omits an unchanged timezone', () => {
    expect(buildProfileUpdate(current, form)).toEqual({ body: {} });
  });

  it('sends a changed timezone without needing a password', () => {
    expect(buildProfileUpdate(current, { ...form, timezone: 'Europe/Berlin' })).toEqual({
      body: { timezone: 'Europe/Berlin' },
    });
  });
});
