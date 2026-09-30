"use server";

import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSuperAdminEmails, sendEmailSafely } from "@/lib/email/alerts";
import { configuredSiteOrigin, sensitiveActionCodeEmail } from "@/lib/email/templates";
import { createClient, createServiceClient, getAdminAccess } from "@/lib/supabase/server";
import { ORDER_ID_PATTERN } from "@/lib/order-ids";

/**
 * Bulk actions for Products, Notifications, Orders and Payments.
 *
 * Products and notifications only need an admin. Payment records are
 * sensitive: deleting them takes a one-time code emailed to the super admins,
 * so an ordinary admin can't erase financial history on their own.
 */

export type BulkResult = { ok: true; message: string } | { ok: false; error: string };

const MAX_BULK = 200;
const CODE_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
const MAX_REQUESTS_PER_15_MIN = 5;

async function requireAdminAccess() {
  const access = await getAdminAccess();
  if (!access) throw new Error("Not authorized.");
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : await createClient();
  return { access, db };
}

const slugList = z
  .array(z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid product."))
  .min(1, "Select at least one item.")
  .max(MAX_BULK, `Select at most ${MAX_BULK} at a time.`);
const uuidList = z
  .array(z.string().uuid("Invalid item."))
  .min(1, "Select at least one item.")
  .max(MAX_BULK, `Select at most ${MAX_BULK} at a time.`);

function fail(err: unknown): BulkResult {
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Invalid selection." };
  return { ok: false, error: err instanceof Error ? err.message : String(err) };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ── Products ────────────────────────────────────────────────────────────────

/** Publishes or unpublishes many products. Products without a photo stay drafts. */
export async function bulkSetProductsActive(ids: string[], active: boolean): Promise<BulkResult> {
  try {
    const { db } = await requireAdminAccess();
    const slugs = slugList.parse(ids);

    let target = slugs;
    let skipped = 0;
    if (active) {
      const { data } = await db.from("products").select("id, images").in("id", slugs);
      target = (data ?? []).filter((p) => p.images?.length).map((p) => p.id);
      skipped = slugs.length - target.length;
    }
    if (target.length) {
      const { error } = await db.from("products").update({ active }).in("id", target);
      if (error) throw new Error(error.message);
    }

    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/home");
    const done = `${plural(target.length, "product")} ${active ? "published" : "unpublished"}`;
    return {
      ok: true,
      message: skipped ? `${done}. ${plural(skipped, "product")} skipped — add a photo first.` : `${done}.`,
    };
  } catch (err) {
    return fail(err);
  }
}

/** Deletes many products. Past orders keep their item details. */
export async function bulkDeleteProducts(ids: string[]): Promise<BulkResult> {
  try {
    const { db } = await requireAdminAccess();
    const slugs = slugList.parse(ids);
    const { error, count } = await db.from("products").delete({ count: "exact" }).in("id", slugs);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/home");
    return { ok: true, message: `${plural(count ?? slugs.length, "product")} deleted.` };
  } catch (err) {
    return fail(err);
  }
}

// ── Notifications ───────────────────────────────────────────────────────────

export async function bulkDeleteNotifications(ids: string[]): Promise<BulkResult> {
  try {
    const { db } = await requireAdminAccess();
    const list = uuidList.parse(ids);
    const { error, count } = await db.from("admin_notifications").delete({ count: "exact" }).in("id", list);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/notifications");
    return { ok: true, message: `${plural(count ?? list.length, "notification")} deleted.` };
  } catch (err) {
    return fail(err);
  }
}

// ── Orders ──────────────────────────────────────────────────────────────────

/**
 * Deletes many unpaid orders. Paid orders are financial records, so they are
 * never deleted here — they go through the emailed-code flow below.
 */
export async function bulkDeleteOrders(ids: string[]): Promise<BulkResult> {
  try {
    const { db } = await requireAdminAccess();
    const list = z
      .array(z.string().regex(ORDER_ID_PATTERN, "Invalid order."))
      .min(1, "Select at least one order.")
      .max(MAX_BULK, `Select at most ${MAX_BULK} at a time.`)
      .parse(ids);
    // Order items go with them (FK cascade).
    const { error, count } = await db
      .from("orders")
      .delete({ count: "exact" })
      .in("id", list)
      .neq("payment_status", "paid");
    if (error) throw new Error(error.message);
    const deleted = count ?? 0;
    const skipped = list.length - deleted;
    revalidatePath("/admin/orders");
    revalidatePath("/admin/transactions");
    revalidatePath("/admin");
    return {
      ok: true,
      message: `${plural(deleted, "order")} deleted.${skipped ? ` ${plural(skipped, "paid order")} kept — paid orders need an approval code.` : ""}`,
    };
  } catch (err) {
    return fail(err);
  }
}

// ── Payments (sensitive: needs an emailed code) ─────────────────────────────

const paymentSelection = z.object({
  /** Successful payments are paid orders — deleting one deletes the order. */
  orderIds: z.array(z.string().regex(/^[A-Z0-9-]{4,40}$/, "Invalid order.")).max(MAX_BULK).default([]),
  /** Failed attempts from the payment_failures log. */
  failureIds: z.array(z.string().uuid("Invalid payment.")).max(MAX_BULK).default([]),
});

function hashCode(requestId: string, code: string): string {
  return createHash("sha256").update(`${requestId}:${code}`).digest("hex");
}

/**
 * Step 1: asks to delete payment records. Emails a one-time code to every
 * super admin and returns the request id the code must be entered against.
 */
export async function requestPaymentDeletion(
  input: { orderIds?: string[]; failureIds?: string[] }
): Promise<{ ok: true; requestId: string; sentTo: number; minutes: number } | { ok: false; error: string }> {
  try {
    const { access } = await requireAdminAccess();
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("This needs the server's service key to be configured.");
    const service = createServiceClient();
    const selection = paymentSelection.parse(input);
    const total = selection.orderIds.length + selection.failureIds.length;
    if (total === 0) throw new Error("Select at least one payment.");

    // Stop code-spamming the super admins' inboxes.
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count: recent } = await service
      .from("sensitive_action_codes")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", access.uid)
      .gte("created_at", since);
    if ((recent ?? 0) >= MAX_REQUESTS_PER_15_MIN) {
      throw new Error("Too many deletion requests. Please wait a few minutes and try again.");
    }

    const recipients = await getSuperAdminEmails();
    const unique = [...new Set(recipients.map((e) => e.trim().toLowerCase()))];
    if (unique.length === 0) throw new Error("No super admin email to send the approval code to.");

    const parts = [
      selection.orderIds.length ? `${plural(selection.orderIds.length, "paid order")} (${selection.orderIds.slice(0, 6).join(", ")}${selection.orderIds.length > 6 ? "…" : ""})` : null,
      selection.failureIds.length ? plural(selection.failureIds.length, "failed payment record") : null,
    ].filter(Boolean);
    const summary = parts.join(" and ");

    const requestId = randomUUID();
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const { error } = await service.from("sensitive_action_codes").insert({
      id: requestId,
      action: "delete_payments",
      payload: selection,
      summary,
      code_hash: hashCode(requestId, code),
      requested_by: access.uid,
      requester_email: access.email ?? null,
      expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
    });
    if (error) throw new Error(error.message);

    const message = sensitiveActionCodeEmail(
      { code, summary, requester: access.email ?? "An admin", minutes: CODE_MINUTES },
      configuredSiteOrigin()
    );
    await Promise.all(unique.map((to) => sendEmailSafely(to, message, "approval-code")));

    return { ok: true, requestId, sentTo: unique.length, minutes: CODE_MINUTES };
  } catch (err) {
    const result = fail(err);
    return result.ok ? { ok: false, error: "Something went wrong." } : result;
  }
}

/**
 * Step 2: deletes exactly what the request listed, if the code matches. A code
 * works once, within 10 minutes, with at most 5 wrong tries.
 */
export async function confirmPaymentDeletion(requestId: string, code: string): Promise<BulkResult> {
  try {
    const { access } = await requireAdminAccess();
    const service = createServiceClient();
    const id = z.string().uuid().parse(requestId);
    const entered = String(code ?? "").replace(/\D/g, "");
    if (entered.length !== 6) throw new Error("Enter the 6-digit code from the email.");

    const { data: request } = await service
      .from("sensitive_action_codes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!request || request.requested_by !== access.uid) throw new Error("That request wasn't found. Start again.");
    if (request.used_at) throw new Error("That code has already been used.");
    if (new Date(request.expires_at).getTime() < Date.now()) throw new Error("That code has expired. Request a new one.");
    if (request.attempts >= MAX_CODE_ATTEMPTS) throw new Error("Too many wrong codes. Request a new one.");

    const expected = Buffer.from(request.code_hash, "hex");
    const actual = Buffer.from(hashCode(id, entered), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await service.from("sensitive_action_codes").update({ attempts: request.attempts + 1 }).eq("id", id);
      const left = MAX_CODE_ATTEMPTS - request.attempts - 1;
      throw new Error(left > 0 ? `Wrong code. ${plural(left, "try")} left.` : "Wrong code. Request a new one.");
    }

    // Claim the code before deleting, so it can't be used twice at once.
    const { data: claimed } = await service
      .from("sensitive_action_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) throw new Error("That code has already been used.");

    const selection = paymentSelection.parse(request.payload);
    let deletedOrders = 0;
    let deletedFailures = 0;
    if (selection.failureIds.length) {
      const { error, count } = await service
        .from("payment_failures")
        .delete({ count: "exact" })
        .in("id", selection.failureIds);
      if (error) throw new Error(error.message);
      deletedFailures = count ?? 0;
    }
    if (selection.orderIds.length) {
      // Order items, prompts and failure logs for these orders go with them.
      const { error, count } = await service.from("orders").delete({ count: "exact" }).in("id", selection.orderIds);
      if (error) throw new Error(error.message);
      deletedOrders = count ?? 0;
    }

    console.info(`[approval] ${access.email} deleted ${request.summary} (request ${id})`);
    revalidatePath("/admin/transactions");
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    const parts = [
      deletedOrders ? plural(deletedOrders, "paid order") : null,
      deletedFailures ? plural(deletedFailures, "failed payment record") : null,
    ].filter(Boolean);
    return { ok: true, message: parts.length ? `Deleted ${parts.join(" and ")}.` : "Nothing left to delete." };
  } catch (err) {
    return fail(err);
  }
}
