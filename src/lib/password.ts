import { z } from 'zod';

// Project password policy (deliberately moderate, per product decision):
// at least 8 characters, with at least one uppercase and one lowercase letter.
// No digit/symbol requirement.
export const PASSWORD_MIN = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter');

// Returns an error message, or null when the password satisfies the policy.
export function validatePassword(pw: string): string | null {
  const r = passwordSchema.safeParse(pw);
  return r.success ? null : r.error.issues[0]?.message ?? 'Invalid password';
}
