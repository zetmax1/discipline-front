import { passwordPolicyError } from './password-policy';

export interface ProfileForm {
  name: string;
  email: string;
  oldPassword: string;
  newPassword: string;
  timezone?: string;
}

export interface ProfileUpdateBody {
  name?: string;
  email?: string;
  oldPassword?: string;
  newPassword?: string;
  timezone?: string;
}

/**
 * Builds the PUT /me body from the form. Changing the email or the password
 * requires the current password (the backend rejects it otherwise).
 */
export function buildProfileUpdate(
  current: { name?: string; email?: string; timezone?: string } | null,
  form: ProfileForm,
): { body?: ProfileUpdateBody; error?: string } {
  const body: ProfileUpdateBody = {};
  if (form.name !== current?.name) body.name = form.name;
  if (form.timezone !== undefined && form.timezone !== current?.timezone) body.timezone = form.timezone;

  const changingEmail = form.email !== current?.email;
  const changingPassword = form.newPassword !== '';
  if (changingEmail) body.email = form.email;

  if (changingEmail || changingPassword) {
    if (!form.oldPassword) {
      return {
        error: changingEmail
          ? 'Enter your current password to change your email.'
          : 'Enter your current password to set a new password.',
      };
    }
    if (changingPassword) {
      const policyError = passwordPolicyError(form.newPassword);
      if (policyError) return { error: policyError };
      body.newPassword = form.newPassword;
    }
    body.oldPassword = form.oldPassword;
  }

  return { body };
}
