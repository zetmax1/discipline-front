import { translate } from '@/i18n/translate';
import type { Locale } from '@/i18n/locales';

// Mirrors the backend policy: at least 10 characters, at most 72 bytes (bcrypt's limit).
export const MIN_PASSWORD_CHARS = 10;
export const MAX_PASSWORD_BYTES = 72;

export function passwordPolicyHint(locale: Locale = 'en'): string {
  return translate(locale, 'auth.passwordHint', { min: MIN_PASSWORD_CHARS });
}

/** Returns a user-facing error if the password breaks the policy, otherwise null. */
export function passwordPolicyError(password: string, locale: Locale = 'en'): string | null {
  if ([...password].length < MIN_PASSWORD_CHARS) {
    return translate(locale, 'auth.passwordTooShort', { min: MIN_PASSWORD_CHARS });
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return translate(locale, 'auth.passwordTooLong', { max: MAX_PASSWORD_BYTES });
  }
  return null;
}
