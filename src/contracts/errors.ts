/**
 * Contract for API error bodies: `{ error: <English text>, code: <stable code>, …extra }`.
 *
 * The UI shows `errors.<code>` from the i18n dictionaries; `error` is only a fallback.
 * `contracts/errors.schema.json` is the exported JSON Schema; the API's Go tests check
 * that its code list equals ERROR_CODES. After changing it, run `npm run contract:update`.
 */
import { z } from 'zod/v4';

export const ERROR_CODES = [
  'internal_error', 'not_found', 'method_not_allowed', 'body_too_large', 'origin_not_allowed', 'rate_limited',
  'service_unavailable', 'validation_failed',
  'auth_required', 'token_invalid', 'forbidden', 'user_not_found', 'invalid_credentials', 'captcha_required',
  'login_throttled', 'email_taken', 'password_too_short', 'password_too_long', 'current_password_required',
  'current_password_incorrect', 'invalid_timezone',
  'task_not_found', 'task_id_invalid', 'task_name_length', 'task_date_invalid', 'task_time_invalid',
  'task_end_before_start', 'task_category_invalid', 'task_energy_invalid', 'task_status_invalid',
  'task_distractions_invalid', 'task_overlap', 'plan_week_invalid',
  'task_focus_rating_invalid', 'task_note_too_long', 'task_not_movable', 'idempotency_key_required',
  'word_not_found', 'word_id_invalid', 'date_invalid',
  'range_invalid', 'days_invalid', 'analytics_unavailable', 'analytics_validation_failed',
] as const;

export const ErrorCode = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorResponse = z.looseObject({
  error: z.string(),
  code: ErrorCode,
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;

/** The JSON Schema file other repos validate against (contracts/errors.schema.json). */
export function exportContract() {
  return {
    error: z.toJSONSchema(ErrorResponse),
  };
}
