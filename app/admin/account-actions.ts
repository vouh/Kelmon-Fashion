"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { UserRecord } from "firebase-admin/auth";
import { accountRole } from "@/lib/auth/roles";
import { isProtectedAccount } from "@/lib/auth/protected-accounts";
import { getEmailSettings, resend } from "@/lib/email/resend";
import { accountInviteEmail } from "@/lib/email/templates";
import { bootstrapAdminEmails, getAdminAuth, setAdminClaim } from "@/lib/firebase/admin";
import { PRODUCTION_SITE_URL } from "@/lib/seo";
import { createServiceClient, getAdminAccess } from "@/lib/supabase/server";
import {
  accountIdSchema,
  accountRoleSchema,
  inviteAccountSchema,
  parseInput,
} from "@/lib/validation/schemas";

/**
 * Account management for the admin Accounts page. Super admins only.
 *
 * Who may do what:
 *   * The owner (lib/auth/protected-accounts.ts) can never be changed.
 *   * Nobody changes their own role.
 *   * Only the owner grants or revokes super admin.
 *   * Other super admins move accounts between User and Admin.
 *
 * profiles.role / super_admin are written with the service role (the only
 * writer Postgres accepts for them), and the Firebase `admin` claim follows.
 */

export type AccountActionResult = { ok: true; message?: string } | { ok: false; error: string };

function fail(error: unknown): AccountActionResult {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}

function parse<T>(result: { ok: true; data: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

async function requireSuperAdmin() {
  const access = await getAdminAccess();
  if (!access?.superAdmin) throw new Error("Only super admins can manage accounts.");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Account management needs SUPABASE_SERVICE_ROLE_KEY on the server.");
  }
  return access;
}

function firebaseCode(error: unknown): string {
  return (error as { code?: string } | null)?.code ?? "";
}

async function firebaseUserByEmail(email: string): Promise<UserRecord | null> {
  try {
    return await getAdminAuth().getUserByEmail(email);
  } catch (error) {
    if (firebaseCode(error) === "auth/user-not-found") return null;
    throw error;
  }
}

function revalidateAccounts(id?: string) {
  revalidatePath("/admin/accounts");
  if (id) revalidatePath(`/admin/accounts/${id}`);
}

// ── Roles ───────────────────────────────────────────────────────────────────

export async function setAccountRole(accountId: unknown, role: unknown): Promise<AccountActionResult> {
  try {
    const access = await requireSuperAdmin();
    const id = parse(parseInput(accountIdSchema, accountId));
    const next = parse(parseInput(accountRoleSchema, role));

    if (id === access.uid) throw new Error("You can't change your own role.");

    const db = createServiceClient();
    const { data: target, error } = await db
      .from("profiles")
      .select("id, email, role, super_admin")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!target) throw new Error("Account not found.");

    if (isProtectedAccount(target.email)) {
      throw new Error("This is the main super admin account. It can't be demoted or removed.");
    }

    const current = accountRole(target);
    if (current === next) return { ok: true, message: "No change." };

    if ((current === "super_admin" || next === "super_admin") && !access.owner) {
      throw new Error("Only the main super admin can promote or demote super admins.");
    }
    if (next === "customer" && bootstrapAdminEmails().includes((target.email ?? "").toLowerCase())) {
      throw new Error(
        "This email is in the server's ADMIN_EMAILS setting, which makes it an admin on every sign-in. Remove it there first."
      );
    }

    const { error: updateError } = await db
      .from("profiles")
      .update({ role: next === "customer" ? "customer" : "admin", super_admin: next === "super_admin" })
      .eq("id", id);
    if (updateError) throw new Error(updateError.message);

    try {
      await setAdminClaim(id, next !== "customer");
    } catch (claimError) {
      // The profile row is what grants access; a missing Firebase user has no claim to fix.
      if (firebaseCode(claimError) !== "auth/user-not-found") throw claimError;
    }

    revalidateAccounts(id);
    return {
      ok: true,
      message:
        next === "customer"
          ? "Admin access removed. They've been signed out of the dashboard."
          : "Role updated. They'll get the new access the next time they sign in.",
    };
  } catch (error) {
    return fail(error);
  }
}

// ── Invites ─────────────────────────────────────────────────────────────────

/** Where invite links point: the live site in production, this dev server locally. */
async function inviteOrigin(): Promise<string> {
  if (process.env.NODE_ENV === "production") return PRODUCTION_SITE_URL;
  const headerList = await headers();
  const host = headerList.get("host");
  if (!host) return "http://localhost:3000";
  return `${headerList.get("x-forwarded-proto") ?? "http"}://${host}`;
}

/**
 * Emails a Kelmon-branded link to /reset-password?mode=invite. It is a Firebase
 * password-reset code under the hood, so it lasts an hour and works once.
 */
async function sendInviteEmail(email: string, name: string | null, admin: boolean): Promise<void> {
  const settings = getEmailSettings();
  if (!resend || !settings.from) {
    throw new Error("Email sending isn't configured (RESEND_API_KEY and RESEND_FROM_EMAIL).");
  }

  const oobCode = new URL(await getAdminAuth().generatePasswordResetLink(email)).searchParams.get("oobCode");
  if (!oobCode) throw new Error("Could not create the invite link. Please try again.");

  const origin = await inviteOrigin();
  const link = `${origin}/reset-password?oobCode=${encodeURIComponent(oobCode)}&mode=invite`;

  const { error } = await resend.emails.send({
    from: settings.from,
    to: email,
    ...accountInviteEmail({ link, origin, name, admin }),
  });
  if (error) throw new Error(`The invite email could not be sent: ${error.message}`);
}

export async function inviteAccount(input: unknown): Promise<AccountActionResult> {
  try {
    await requireSuperAdmin();
    const { email, fullName, role } = parse(parseInput(inviteAccountSchema, input));

    const settings = getEmailSettings();
    if (!resend || !settings.from) {
      throw new Error("Email sending isn't configured (RESEND_API_KEY and RESEND_FROM_EMAIL).");
    }
    if (await firebaseUserByEmail(email)) {
      throw new Error("There's already an account with this email. Find it in the list to change its role.");
    }

    const auth = getAdminAuth();
    const user = await auth.createUser({ email, displayName: fullName, emailVerified: false });
    const db = createServiceClient();

    try {
      const { error } = await db.from("profiles").insert({
        id: user.uid,
        email,
        full_name: fullName ?? null,
        role: role === "admin" ? "admin" : "customer",
      });
      if (error) throw new Error(error.message);

      await auth.setCustomUserClaims(user.uid, { role: "authenticated", admin: role === "admin" });
      await sendInviteEmail(email, fullName ?? null, role === "admin");
    } catch (error) {
      // Undo, so the same email can simply be invited again.
      await db.from("profiles").delete().eq("id", user.uid);
      await auth.deleteUser(user.uid).catch(() => undefined);
      throw error;
    }

    revalidateAccounts();
    return { ok: true, message: `Invite sent to ${email}.` };
  } catch (error) {
    return fail(error);
  }
}

/** Sends a fresh link to someone who hasn't set their password yet. */
export async function resendInvite(accountId: unknown): Promise<AccountActionResult> {
  try {
    await requireSuperAdmin();
    const id = parse(parseInput(accountIdSchema, accountId));

    const user = await getAdminAuth().getUser(id);
    if (!user.email) throw new Error("This account has no email address.");
    if (user.providerData.length > 0) {
      throw new Error("They've already set up their account. They can use “Forgot password” if they're locked out.");
    }

    const { data: profile } = await createServiceClient()
      .from("profiles")
      .select("full_name, role")
      .eq("id", id)
      .maybeSingle();

    await sendInviteEmail(user.email, profile?.full_name ?? null, profile?.role === "admin");
    return { ok: true, message: `A new invite was sent to ${user.email}.` };
  } catch (error) {
    return fail(error);
  }
}
