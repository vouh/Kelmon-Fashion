/**
 * The owner: always a super admin, and never deleted, demoted or changed by
 * anyone. Other super admins are ordinary rows (profiles.super_admin) that the
 * owner can grant and revoke.
 *
 * Keep in step with public.is_protected_account() in the
 * 20260930090000_account_roles migration, which enforces the same rule inside
 * Postgres.
 */
export const PROTECTED_SUPER_ADMIN_EMAILS: readonly string[] = ["peterkelvinkibiru1532@gmail.com"];

export function isProtectedAccount(email: string | null | undefined): boolean {
  return Boolean(email) && PROTECTED_SUPER_ADMIN_EMAILS.includes(email!.trim().toLowerCase());
}
