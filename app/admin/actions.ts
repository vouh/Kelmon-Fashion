"use server";

import { revalidatePath } from "next/cache";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";
import {
  dealInputSchema,
  directOrderSchema,
  parseInput,
  productInputSchema,
  productSlugSchema,
  updateInputSchema,
  type ProductInput,
} from "@/lib/validation/schemas";

/**
 * Admin mutations as Server Actions.
 *
 * Ports the admin write half of js/firebase-service.js: fb_updateOrderStatus,
 * fb_deleteOrder, fb_createDeal, fb_deleteDeal, fb_createUpdate,
 * fb_deleteUpdate, fb_deleteReview, fb_createDirectOrder, plus new product CRUD.
 *
 * Two guards on every action, and neither is redundant:
 *
 *   * `requireAdmin()` — RLS would reject a non-admin write anyway, but failing
 *     here gives a clear error instead of a silent no-op.
 *   * A Zod parse of the input. These read like function calls in the editor,
 *     which is exactly the trap: a Server Action is a POST endpoint that anyone
 *     can invoke with any body, typed parameters notwithstanding.
 */

async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Not authorized.");
  }
  return createClient();
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function ok(): ActionResult {
  return { ok: true };
}

function fail(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}

/** An id arriving from the client is still untrusted input. */
function validSlug(id: unknown): string {
  const parsed = parseInput(productSlugSchema, id);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.data;
}

/** Row ids are uuids, and a malformed one should fail before reaching Postgres. */
function validUuid(id: unknown): string {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("Invalid id.");
  }
  return id;
}

/** Order ids are the human-readable KM-XXXXX form from createOrderId(). */
function validOrderId(id: unknown): string {
  if (typeof id !== "string" || !/^KM-[A-Z0-9]{4,20}$/.test(id)) {
    throw new Error("Invalid order id.");
  }
  return id;
}

// ── Orders ──────────────────────────────────────────────────────────────────

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const id = validOrderId(orderId);
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const id = validOrderId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: paymentStatus })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/orders");
    revalidatePath("/admin/transactions");
    revalidatePath("/admin");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function deleteOrder(orderId: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const id = validOrderId(orderId);
    // order_items cascade via the FK.
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

/**
 * Admin-created order for a walk-up / road sale.
 * Ports fb_createDirectOrder — source='admin_direct' and no user_id.
 */
export async function createDirectOrder(input: {
  customerName: string;
  phone: string;
  dropPoint: string;
  total: number;
  notes?: string;
}): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  try {
    const supabase = await requireAdmin();

    const parsed = parseInput(directOrderSchema, input);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const order = parsed.data;

    const orderId = `KM-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase.from("orders").insert({
      id: orderId,
      user_id: null,
      customer_name: order.customerName,
      // Normalised to 2547… by the schema, so it can be charged by STK push
      // without further cleaning.
      phone: order.phone,
      drop_point: order.dropPoint,
      notes: order.notes ?? null,
      payment_method: "mpesa",
      subtotal: order.total,
      delivery_fee: 0,
      total: order.total,
      status: "pending",
      payment_status: "unpaid",
      source: "admin_direct",
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { ok: true, orderId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, error };
  }
}

// ── Products (new — no EzyBite equivalent) ──────────────────────────────────

// Inferred from the schema rather than declared separately, so the form's type
// and the validation can never disagree about a field.
export type { ProductInput };

export async function upsertProduct(input: ProductInput): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();

    // Replaces the hand-rolled checks that used to live here — same rules, plus
    // the slug format, image URLs, array sizes and the "was" price comparison,
    // each with its own message.
    const parsed = parseInput(productInputSchema, input);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const product = parsed.data;

    const { error } = await supabase.from("products").upsert({
      id: product.id,
      name: product.name,
      description: product.description ?? null,
      price: product.price,
      original_price: product.originalPrice ?? null,
      category: product.category,
      images: product.images,
      sizes: product.sizes,
      colors: product.colors,
      stock: product.stock,
      badge: product.badge ?? null,
      active: product.active,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");
    revalidatePath(`/product/${product.id}`);
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const slug = validSlug(id);
    const { error } = await supabase.from("products").delete().eq("id", slug);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function setProductActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const slug = validSlug(id);
    const { error } = await supabase.from("products").update({ active }).eq("id", slug);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

// ── Deals ───────────────────────────────────────────────────────────────────

export async function createDeal(input: {
  title: string;
  description?: string;
  image?: string;
  code?: string;
  discountPercent?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();

    const parsed = parseInput(dealInputSchema, input);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const deal = parsed.data;

    const { error } = await supabase.from("deals").insert({
      title: deal.title,
      description: deal.description ?? null,
      image: deal.image || null,
      code: deal.code ?? null,
      discount_percent: deal.discountPercent ?? null,
      starts_at: deal.startsAt ?? null,
      ends_at: deal.endsAt ?? null,
      active: true,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/deals");
    revalidatePath("/");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function deleteDeal(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("deals").delete().eq("id", validUuid(id));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/deals");
    revalidatePath("/");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

// ── Updates ─────────────────────────────────────────────────────────────────

export async function createUpdate(input: {
  title: string;
  body: string;
  tag?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();

    const parsed = parseInput(updateInputSchema, input);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const update = parsed.data;

    const { error } = await supabase.from("updates").insert({
      title: update.title,
      body: update.body,
      tag: update.tag ?? null,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/updates");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function deleteUpdate(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("updates").delete().eq("id", validUuid(id));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/updates");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function deleteReview(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("reviews").delete().eq("id", validUuid(id));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/reviews");
    return ok();
  } catch (err) {
    return fail(err);
  }
}
