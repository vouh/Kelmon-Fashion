/**
 * The three account roles as the admin panel shows them. In the database a
 * super admin is role 'admin' with profiles.super_admin set.
 */
export type AccountRole = "customer" | "admin" | "super_admin";

export const ROLE_LABELS: Record<AccountRole, string> = {
  customer: "User",
  admin: "Admin",
  super_admin: "Super admin",
};

export function accountRole(row: { role: string; super_admin?: boolean | null }): AccountRole {
  if (row.role !== "admin") return "customer";
  return row.super_admin ? "super_admin" : "admin";
}
