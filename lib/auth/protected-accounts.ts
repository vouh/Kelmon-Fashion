/**
 * Super admins that can never be deleted or lose admin rights.
 *
 * Keep in step with public.is_protected_account() in the
 * 20260928200000_protected_super_admins migration, which enforces the same rule
 * inside Postgres.
 */
export const PROTECTED_SUPER_ADMIN_EMAILS: readonly string[] = [
  "peterkelvinkibiru1532@gmail.com",
  "monicapeter398@gmail.com",
];

export function isProtectedAccount(email: string | null | undefined): boolean {
  return Boolean(email) && PROTECTED_SUPER_ADMIN_EMAILS.includes(email!.trim().toLowerCase());
}
