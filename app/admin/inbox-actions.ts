"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getEmailSettings, resend } from "@/lib/email/resend";
import { announcementEmail, configuredSiteOrigin } from "@/lib/email/templates";
import {
  CONTACT_RECIPIENTS_KEY,
  MAX_CONTACT_RECIPIENTS,
  resolveAudience,
} from "@/lib/supabase/admin-inbox";
import { createClient, getAdminEmail, isAdmin } from "@/lib/supabase/server";
import { ORDER_ALERT_RECIPIENTS_KEY } from "@/lib/email/alerts";

/**
 * Server Actions for admin Settings, Notifications and Communications.
 * Same two guards as app/admin/actions.ts: an admin check up front, and a
 * Zod parse of anything the client sends.
 */

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorized.");
  return createClient();
}

function fail(err: unknown): ActionResult {
  return { ok: false, error: err instanceof Error ? err.message : String(err) };
}

const uuid = z.string().uuid("Invalid id.");
const email = z.string().trim().toLowerCase().email();

// ── Settings ────────────────────────────────────────────────────────────────

export async function saveContactRecipients(emails: string[]): Promise<ActionResult> {
  return saveEmailList(CONTACT_RECIPIENTS_KEY, emails);
}

/** Who gets "new order" and "payment received" emails (super admins always do). */
export async function saveOrderAlertRecipients(emails: string[]): Promise<ActionResult> {
  return saveEmailList(ORDER_ALERT_RECIPIENTS_KEY, emails);
}

async function saveEmailList(key: string, emails: string[]): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const parsed = z
      .array(email)
      .max(MAX_CONTACT_RECIPIENTS, `At most ${MAX_CONTACT_RECIPIENTS} addresses.`)
      .safeParse(emails.map((e) => e.trim()).filter(Boolean));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email address." };
    }
    const unique = [...new Set(parsed.data)];

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value: unique, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/settings");
    return { ok: true, message: "Saved." };
  } catch (err) {
    return fail(err);
  }
}

// ── Notifications ───────────────────────────────────────────────────────────

export async function markNotificationsRead(ids: string[] | "all"): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    let query = supabase.from("admin_notifications").update({ read: true }).eq("read", false);
    if (ids !== "all") query = query.in("id", z.array(uuid).max(500).parse(ids));
    const { error } = await query;
    if (error) throw new Error(error.message);
    revalidatePath("/admin/notifications");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("admin_notifications").delete().eq("id", uuid.parse(id));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/notifications");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function clearReadNotifications(): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("admin_notifications").delete().eq("read", true);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/notifications");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Communications ──────────────────────────────────────────────────────────

export async function setContactMessageRead(id: string, read: boolean): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase
      .from("contact_messages")
      .update({ read })
      .eq("id", uuid.parse(id));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/communications");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteContactMessage(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("contact_messages").delete().eq("id", uuid.parse(id));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/communications");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

const sendEmailSchema = z
  .object({
    audience: z.enum(["all_customers", "customers_with_orders", "custom"]),
    customRecipients: z.array(email).max(50, "At most 50 custom recipients.").default([]),
    subject: z.string().trim().min(1, "Add a subject.").max(160),
    body: z.string().trim().min(1, "Write a message.").max(10_000),
  })
  .refine((v) => v.audience !== "custom" || v.customRecipients.length > 0, {
    path: ["customRecipients"],
    message: "Add at least one email address.",
  });

/** Resend's batch endpoint takes up to 100 emails per call. */
const BATCH_SIZE = 100;

export async function sendEmailCampaign(input: {
  audience: "all_customers" | "customers_with_orders" | "custom";
  customRecipients?: string[];
  subject: string;
  body: string;
}): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();

    const parsed = sendEmailSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    }
    const message = parsed.data;

    const settings = getEmailSettings();
    if (!resend || !settings.from) {
      return { ok: false, error: "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)." };
    }

    const recipients =
      message.audience === "custom"
        ? [...new Set(message.customRecipients)]
        : await resolveAudience(message.audience);
    if (recipients.length === 0) return { ok: false, error: "No one to send to." };

    const origin = configuredSiteOrigin();
    const content = announcementEmail({ subject: message.subject, body: message.body }, origin);

    // One email per person, so recipients never see each other's addresses.
    let failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE);
      try {
        const { error } = await resend.batch.send(
          chunk.map((to) => ({ from: settings.from!, to, ...content }))
        );
        if (error) {
          console.error("[communications] batch failed:", error);
          failed += chunk.length;
        }
      } catch (err) {
        console.error("[communications] batch failed:", err);
        failed += chunk.length;
      }
    }

    const { error: logError } = await supabase.from("email_campaigns").insert({
      subject: message.subject,
      body: message.body,
      audience: message.audience,
      recipient_count: recipients.length,
      failed_count: failed,
      sent_by: await getAdminEmail(),
    });
    if (logError) console.error("[communications] log failed:", logError.message);

    revalidatePath("/admin/communications");

    if (failed === recipients.length) {
      return { ok: false, error: "Sending failed. Check the Resend dashboard for details." };
    }
    const sent = recipients.length - failed;
    return {
      ok: true,
      message: `Sent to ${sent} recipient${sent === 1 ? "" : "s"}${failed ? ` (${failed} failed)` : ""}.`,
    };
  } catch (err) {
    return fail(err);
  }
}
