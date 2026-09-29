"use server";

import { revalidatePath } from "next/cache";
import { createClient, isAdmin } from "@/lib/supabase/server";
import type {
  OrderItemRow,
  OrderRow,
  OrderStatus,
  PaymentFailureRow,
  PaymentStatus,
} from "@/lib/supabase/types";
import {
  dealInputSchema,
  directOrderSchema,
  homepageDropInputSchema,
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
    // Marking an order paid takes its items off the shelf (orders_deduct_stock).
    if (paymentStatus === "paid") {
      revalidatePath("/admin/products");
      revalidatePath("/shop");
      revalidatePath("/home");
    }
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export interface OrderDetails {
  order: OrderRow;
  items: OrderItemRow[];
  /** The account that placed the order, when it came from a signed-in customer. */
  account: { fullName: string | null; email: string | null } | null;
  /** Failed M-Pesa attempts on this order, newest first. */
  failures: Pick<PaymentFailureRow, "id" | "reason" | "phone" | "amount" | "created_at">[];
}

export async function getOrderDetails(
  orderId: string
): Promise<{ ok: true; details: OrderDetails } | { ok: false; error: string }> {
  try {
    const supabase = await requireAdmin();
    const id = validOrderId(orderId);

    const [orderRes, itemsRes, failuresRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", id),
      supabase
        .from("payment_failures")
        .select("id, reason, phone, amount, created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
    ]);
    if (orderRes.error) throw new Error(orderRes.error.message);
    if (!orderRes.data) throw new Error("Order not found.");
    const order = orderRes.data;

    let account: OrderDetails["account"] = null;
    if (order.user_id) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", order.user_id)
        .maybeSingle();
      if (data) account = { fullName: data.full_name, email: data.email };
    }

    return {
      ok: true,
      details: {
        order,
        items: itemsRes.data ?? [],
        account,
        failures: failuresRes.data ?? [],
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
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
  item?: { productId?: string; name: string; price: number; quantity: number };
}): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  try {
    const supabase = await requireAdmin();

    const parsed = parseInput(directOrderSchema, input);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const order = parsed.data;
    const item = order.item;

    let product: { images: string[]; category: string } | null = null;
    if (item?.productId) {
      const { data, error: productError } = await supabase
        .from("products")
        .select("images, category")
        .eq("id", item.productId)
        .maybeSingle();
      if (productError) throw new Error(productError.message);
      if (!data) throw new Error("That product no longer exists. Pick another or type it in.");
      product = data;
    }

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

    if (item) {
      const { error: itemError } = await supabase.from("order_items").insert({
        order_id: orderId,
        // No product_id marks a typed-in item: it takes no stock and shows as
        // "reconcile" in the orders list.
        product_id: item.productId ?? null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: product?.images[0] ?? null,
        category: product?.category ?? null,
      });
      if (itemError) {
        await supabase.from("orders").delete().eq("id", orderId);
        throw new Error(itemError.message);
      }
    }

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
      color_images: product.colorImages,
      stock: product.stock,
      badge: product.badge ?? null,
      active: product.active,
    });
    if (error) throw new Error(error.message);

    // A category typed into the form joins the list, hidden from the shop
    // filter until switched on in /admin/categories.
    const { error: categoryError } = await supabase
      .from("categories")
      .upsert({ name: product.category, sort_order: 100 }, { onConflict: "name", ignoreDuplicates: true });
    if (categoryError) console.warn("[upsertProduct] category not recorded:", categoryError.message);

    revalidatePath("/admin/products");
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    revalidatePath("/home");
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
    revalidatePath("/home");
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

// ── Categories ──────────────────────────────────────────────────────────────

function validCategoryName(name: unknown): string {
  const trimmed = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!trimmed) throw new Error("Category name is required.");
  if (trimmed.length > 60) throw new Error("Category name must be 60 characters or fewer.");
  return trimmed;
}

function revalidateCategories() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

export async function createCategory(name: string, showInFilter: boolean): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const categoryName = validCategoryName(name);

    const { data: existing, error: listError } = await supabase
      .from("categories")
      .select("name, sort_order");
    if (listError) throw new Error(listError.message);

    if (existing?.some((c) => c.name.toLowerCase() === categoryName.toLowerCase())) {
      throw new Error(`"${categoryName}" already exists.`);
    }

    const nextOrder = Math.max(0, ...(existing ?? []).map((c) => c.sort_order)) + 1;
    const { error } = await supabase
      .from("categories")
      .insert({ name: categoryName, show_in_filter: Boolean(showInFilter), sort_order: nextOrder });
    if (error) throw new Error(error.message);

    revalidateCategories();
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function setCategoryInFilter(name: string, show: boolean): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase
      .from("categories")
      .update({ show_in_filter: Boolean(show) })
      .eq("name", validCategoryName(name));
    if (error) throw new Error(error.message);
    revalidateCategories();
    return ok();
  } catch (err) {
    return fail(err);
  }
}

/** Swaps a category with its neighbour, then renumbers so orders stay distinct. */
export async function moveCategory(name: string, direction: "up" | "down"): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const categoryName = validCategoryName(name);

    const { data, error: listError } = await supabase
      .from("categories")
      .select("name")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (listError) throw new Error(listError.message);

    const names = (data ?? []).map((c) => c.name);
    const index = names.indexOf(categoryName);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= names.length) return ok();

    [names[index], names[target]] = [names[target], names[index]];
    for (const [i, n] of names.entries()) {
      const { error } = await supabase.from("categories").update({ sort_order: i + 1 }).eq("name", n);
      if (error) throw new Error(error.message);
    }

    revalidateCategories();
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCategory(name: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const categoryName = validCategoryName(name);

    const { count, error: countError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category", categoryName);
    if (countError) throw new Error(countError.message);
    if (count) {
      throw new Error(
        `${count} product${count === 1 ? " is" : "s are"} still in "${categoryName}". Move ${count === 1 ? "it" : "them"} to another category first.`
      );
    }

    const { error } = await supabase.from("categories").delete().eq("name", categoryName);
    if (error) throw new Error(error.message);

    revalidateCategories();
    return ok();
  } catch (err) {
    return fail(err);
  }
}

/**
 * Takes stock off (negative delta) or puts it back, e.g. for a sale made
 * outside the site. Atomic in Postgres and floored at zero. A product at zero
 * drops out of the shop until it is restocked.
 */
export async function adjustProductStock(id: string, delta: number): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const slug = validSlug(id);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 10_000) {
      throw new Error("Enter a whole number of items.");
    }
    const { data, error } = await supabase.rpc("adjust_product_stock", {
      p_product_id: slug,
      p_delta: delta,
    });
    if (error) throw new Error(error.message);
    if (data === null) throw new Error("Product not found.");
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/home");
    revalidatePath(`/product/${slug}`);
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
    revalidatePath("/home");
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
    revalidatePath("/home");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

// ── Homepage drops ─────────────────────────────────────────────────────────

export async function upsertHomepageDrop(input: {
  id?: string;
  name: string;
  price: number;
  category: string;
  image: string;
  active: boolean;
}): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const parsed = parseInput(homepageDropInputSchema, input);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const drop = parsed.data;

    if (drop.id) {
      const { error } = await supabase
        .from("homepage_drops")
        .update({ name: drop.name, price: drop.price, category: drop.category, image: drop.image, active: drop.active })
        .eq("id", validUuid(drop.id));
      if (error) throw new Error(error.message);
    } else {
      const { data, error: listError } = await supabase.from("homepage_drops").select("sort_order");
      if (listError) throw new Error(listError.message);
      const sortOrder = Math.max(0, ...(data ?? []).map((row) => row.sort_order)) + 1;
      const { error } = await supabase.from("homepage_drops").insert({ ...drop, sort_order: sortOrder });
      if (error) throw new Error(error.message);
    }

    revalidatePath("/home");
    revalidatePath("/admin/homepage-drops");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function deleteHomepageDrop(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("homepage_drops").delete().eq("id", validUuid(id));
    if (error) throw new Error(error.message);
    revalidatePath("/home");
    revalidatePath("/admin/homepage-drops");
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
