"use server";

import { revalidatePath } from "next/cache";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type { BookingStatus, OrderStatus, PaymentStatus } from "@/lib/supabase/types";

/**
 * Admin mutations as Server Actions.
 *
 * Ports the admin write half of js/firebase-service.js: fb_updateOrderStatus,
 * fb_deleteOrder, fb_createDeal, fb_deleteDeal, fb_createUpdate,
 * fb_deleteUpdate, fb_deleteReview, fb_createDirectOrder, plus new product CRUD.
 *
 * Every action re-checks the admin role. RLS would reject a non-admin write
 * anyway, but failing here gives a clear error instead of a silent no-op.
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

// ── Orders ──────────────────────────────────────────────────────────────────

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
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
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: paymentStatus })
      .eq("id", orderId);
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
    // order_items cascade via the FK.
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
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
    const orderId = `KM-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase.from("orders").insert({
      id: orderId,
      user_id: null,
      customer_name: input.customerName,
      phone: input.phone,
      drop_point: input.dropPoint,
      notes: input.notes ?? null,
      payment_method: "mpesa",
      subtotal: input.total,
      delivery_fee: 0,
      total: input.total,
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

export interface ProductInput {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  category: string;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  badge?: string | null;
  active: boolean;
}

export async function upsertProduct(input: ProductInput): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();

    if (!input.id.trim()) throw new Error("Product slug is required.");
    if (!input.name.trim()) throw new Error("Product name is required.");
    if (input.price <= 0) throw new Error("Price must be greater than zero.");
    if (input.originalPrice && input.originalPrice < input.price) {
      throw new Error("Original price must be higher than the sale price.");
    }

    const { error } = await supabase.from("products").upsert({
      id: input.id.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price,
      original_price: input.originalPrice ?? null,
      category: input.category,
      images: input.images,
      sizes: input.sizes,
      colors: input.colors,
      stock: input.stock,
      badge: input.badge || null,
      active: input.active,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");
    revalidatePath(`/product/${input.id}`);
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("products").delete().eq("id", id);
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
    const { error } = await supabase.from("products").update({ active }).eq("id", id);
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
  endsAt?: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    if (!input.title.trim()) throw new Error("Deal title is required.");

    const { error } = await supabase.from("deals").insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      image: input.image?.trim() || null,
      code: input.code?.trim() || null,
      discount_percent: input.discountPercent ?? null,
      ends_at: input.endsAt || null,
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
    const { error } = await supabase.from("deals").delete().eq("id", id);
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
    if (!input.title.trim()) throw new Error("Title is required.");
    if (!input.body.trim()) throw new Error("Body is required.");

    const { error } = await supabase.from("updates").insert({
      title: input.title.trim(),
      body: input.body.trim(),
      tag: input.tag?.trim() || null,
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
    const { error } = await supabase.from("updates").delete().eq("id", id);
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
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/reviews");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

// ── Salon bookings ──────────────────────────────────────────────────────────

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("salon_bookings").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/bookings");
    return ok();
  } catch (err) {
    return fail(err);
  }
}
