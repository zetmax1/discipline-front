// Mirrors the backend policy: at least 10 characters, at most 72 bytes (bcrypt's limit).
export const MIN_PASSWORD_CHARS = 10;
export const MAX_PASSWORD_BYTES = 72;

export const PASSWORD_POLICY_HINT = `At least ${MIN_PASSWORD_CHARS} characters`;

/** Returns a user-facing error if the password breaks the policy, otherwise null. */
export function passwordPolicyError(password: string): string | null {
  if ([...password].length < MIN_PASSWORD_CHARS) {
    return `Password must be at least ${MIN_PASSWORD_CHARS} characters.`;
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return `Password must be at most ${MAX_PASSWORD_BYTES} bytes.`;
  }
  return null;
}
