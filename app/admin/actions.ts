"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isOrderId } from "@/lib/order-ids";
import { HOMEPAGE_DROPS_SHUFFLE_KEY, MAX_HOMEPAGE_DROPS } from "@/lib/homepage-drops";
import { nextOrderId } from "@/lib/supabase/orders";
import { after } from "next/server";
import { sendManualPaymentEmails } from "@/lib/email/alerts";
import { createClient, createServiceClient, isAdmin } from "@/lib/supabase/server";
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
  linkOrderSchema,
  parseInput,
  productImportRowSchema,
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

/**
 * Verifies the caller is an admin (Firebase identity + the admin role on their
 * profile), then returns a database client for the action.
 *
 * The service role, not the caller's token: the Firebase ID token lives an
 * hour, and once it lapses RLS sees an anonymous caller — writes then match no
 * rows and fail silently (the product-page +/- buttons "did nothing"). The
 * admin check above already uses the two-week session, so it's the gate.
 */
async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Not authorized.");
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : createClient();
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

/** Order ids: P001-20260930-01, or the older KM-XXXXX form (lib/order-ids.ts). */
function validOrderId(id: unknown): string {
  if (!isOrderId(id)) {
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
    // Only the unpaid -> paid transition sends receipts, so re-saving an
    // already-paid order doesn't email anyone twice.
    const { data: changed, error } = await supabase
      .from("orders")
      .update({ payment_status: paymentStatus })
      .eq("id", id)
      .neq("payment_status", paymentStatus)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (changed && paymentStatus === "paid") {
      after(() => sendManualPaymentEmails(id));
    }
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
 * Admin-created order for a walk-up / road sale, or one paid outside the
 * system (cash, or M-Pesa sent straight to the till).
 * Ports fb_createDirectOrder — source='admin_direct' and no user_id.
 *
 * A paid order is still inserted unpaid and then flipped to paid: the stock
 * and paid_at triggers only act on that update, never on an insert.
 */
export async function createDirectOrder(input: {
  customerName: string;
  phone?: string;
  dropPoint: string;
  notes?: string;
  items: { productId?: string; name: string; variant?: string; price: number; quantity: number }[];
  paid?: { method: "mpesa" | "cash"; reference?: string };
}): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  try {
    const supabase = await requireAdmin();

    const parsed = parseInput(directOrderSchema, input);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const order = parsed.data;
    const items = order.items;
    const paid = order.paid;

    const productIds = [...new Set(items.flatMap((item) => (item.productId ? [item.productId] : [])))];
    const products = new Map<string, { images: string[]; category: string }>();
    if (productIds.length) {
      const { data, error: productError } = await supabase
        .from("products")
        .select("id, images, category")
        .in("id", productIds);
      if (productError) throw new Error(productError.message);
      for (const row of data ?? []) products.set(row.id, row);
      const missing = items.find((item) => item.productId && !products.has(item.productId));
      if (missing) throw new Error(`"${missing.name}" no longer exists. Remove it or type it in.`);
    }

    const total = Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;

    const orderId = await nextOrderId(
      supabase,
      items.map((item) => ({ productId: item.productId ?? null, price: item.price, quantity: item.quantity }))
    );

    const { error } = await supabase.from("orders").insert({
      id: orderId,
      user_id: null,
      customer_name: order.customerName,
      // Normalised to 2547… by the schema, so it can be charged by STK push
      // without further cleaning.
      phone: order.phone ?? "",
      drop_point: order.dropPoint,
      notes: order.notes ?? null,
      payment_method: paid?.method === "cash" ? "cod" : "mpesa",
      subtotal: total,
      delivery_fee: 0,
      total,
      status: "pending",
      payment_status: "unpaid",
      source: "admin_direct",
    });
    if (error) throw new Error(error.message);

    const { error: itemError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: orderId,
        // No product_id marks a typed-in item: it takes no stock and shows as
        // "reconcile" in the orders list.
        product_id: item.productId ?? null,
        name: item.name,
        variant: item.variant ?? null,
        price: item.price,
        quantity: item.quantity,
        image: (item.productId && products.get(item.productId)?.images[0]) || null,
        category: (item.productId && products.get(item.productId)?.category) || null,
      }))
    );
    if (itemError) {
      await supabase.from("orders").delete().eq("id", orderId);
      throw new Error(itemError.message);
    }

    if (paid) {
      // Takes the stock off and stamps paid_at (orders_deduct_stock,
      // orders_set_paid_at), the same as marking an order paid in the list.
      const { error: paidError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "confirmed",
          mpesa_receipt_number: paid.method === "mpesa" ? paid.reference ?? null : null,
        })
        .eq("id", orderId);
      if (paidError) {
        await supabase.from("orders").delete().eq("id", orderId);
        throw new Error(paidError.message);
      }
      after(() => sendManualPaymentEmails(orderId));
      revalidatePath("/admin/transactions");
      revalidatePath("/admin/products");
      revalidatePath("/shop");
      revalidatePath("/home");
    }
    // Otherwise staff are emailed when the STK payment succeeds (sendPaymentSuccessEmails).

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { ok: true, orderId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, error };
  }
}

export interface LinkableClient {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

/** Accounts to choose from when linking a quick order to a client. */
export async function listLinkableClients(): Promise<
  { ok: true; clients: LinkableClient[] } | { ok: false; error: string }
> {
  try {
    const supabase = await requireAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return {
      ok: true,
      clients: (data ?? []).map((p) => ({ id: p.id, name: p.full_name, email: p.email, phone: p.phone })),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fills in a quick order after the fact: links it to a client's account
 * and/or swaps its typed-in lines for catalogue products. The order total is
 * left alone — it is what the customer was charged.
 *
 * If the order was already paid, its stock came off before these products
 * were known, so they are taken off here instead; and a newly linked client
 * gets the loyalty points the payment earned.
 */
export async function linkOrder(
  orderId: string,
  input: {
    userId?: string;
    items?: { productId: string; variant?: string; price: number; quantity: number }[];
  }
): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const id = validOrderId(orderId);
    const parsed = parseInput(linkOrderSchema, input);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const link = parsed.data;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, payment_status, stock_deducted, customer_name")
      .eq("id", id)
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) throw new Error("Order not found.");

    if (link.items) {
      const ids = [...new Set(link.items.map((item) => item.productId))];
      const { data: rows, error: productError } = await supabase
        .from("products")
        .select("id, name, images, category")
        .in("id", ids);
      if (productError) throw new Error(productError.message);
      const products = new Map((rows ?? []).map((row) => [row.id, row]));
      if (products.size !== ids.length) throw new Error("One of those products no longer exists.");

      const { error: insertError } = await supabase.from("order_items").insert(
        link.items.map((item) => {
          const product = products.get(item.productId)!;
          return {
            order_id: id,
            product_id: item.productId,
            name: product.name,
            variant: item.variant ?? null,
            price: item.price,
            quantity: item.quantity,
            image: product.images[0] ?? null,
            category: product.category,
          };
        })
      );
      if (insertError) throw new Error(insertError.message);

      // The typed-in placeholder lines are replaced by the products above.
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", id)
        .is("product_id", null);
      if (deleteError) throw new Error(deleteError.message);

      if (order.stock_deducted) {
        for (const item of link.items) {
          const { error } = await supabase.rpc("adjust_product_stock", {
            p_product_id: item.productId,
            p_delta: -item.quantity,
          });
          if (error) throw new Error(error.message);
        }
        revalidatePath("/admin/products");
        revalidatePath("/shop");
        revalidatePath("/home");
      }
    }

    if (link.userId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", link.userId)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);
      if (!profile) throw new Error("That client's account no longer exists.");

      const { error } = await supabase
        .from("orders")
        .update({
          user_id: link.userId,
          customer_name: profile.full_name || profile.email || order.customer_name,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);

      if (order.payment_status === "paid") {
        // Idempotent: skips an order whose points were already given.
        await supabase.rpc("award_loyalty_points", { p_order_id: id });
      }
      revalidatePath("/admin/accounts");
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return ok();
  } catch (err) {
    return fail(err);
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
      gender: product.gender,
      category: product.category,
      images: product.images,
      sizes: product.sizes,
      colors: product.colors,
      color_images: product.colorImages,
      stock: product.stock,
      badge: product.badge ?? null,
      preorder: product.preorder,
      active: product.active,
    });
    if (error) throw new Error(error.message);

    const costWrite =
      product.buyPrice == null
        ? await supabase.from("product_costs").delete().eq("product_id", product.id)
        : await supabase.from("product_costs").upsert({ product_id: product.id, buy_price: product.buyPrice });
    if (costWrite.error) throw new Error(`Product saved, but the buying price wasn't: ${costWrite.error.message}`);

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
    if (active) {
      // A product with no photo would show as a blank card in the shop.
      const { data: product } = await supabase.from("products").select("images").eq("id", slug).maybeSingle();
      if (!product) throw new Error("Product not found.");
      if (!product.images?.length) {
        throw new Error("Add at least one photo before publishing — open the product with the edit button.");
      }
    }
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
  productId?: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const parsed = parseInput(homepageDropInputSchema, input);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const { productId, id, ...drop } = parsed.data;

    // Linked to a product: save its current details as the card's fallback
    // (the homepage reads the live ones), so the card is right even if the
    // product is deleted later.
    let row = { ...drop, product_id: productId ?? null };
    if (productId) {
      const { data: product } = await supabase
        .from("products")
        .select("id, name, price, category, images")
        .eq("id", productId)
        .maybeSingle();
      if (!product) throw new Error("That product no longer exists. Pick another one.");
      row = {
        ...row,
        name: product.name,
        price: Number(product.price),
        category: product.category,
        // Keep a custom image if one was chosen; otherwise the product's cover.
        image: drop.image || product.images?.[0] || drop.image,
      };
      if (!row.image) throw new Error("That product has no photo yet — add one to it first, or upload an image here.");
    }

    if (id) {
      const { error } = await supabase.from("homepage_drops").update(row).eq("id", validUuid(id));
      if (error) throw new Error(error.message);
    } else {
      const { data, error: listError } = await supabase.from("homepage_drops").select("sort_order");
      if (listError) throw new Error(listError.message);
      if ((data ?? []).length >= MAX_HOMEPAGE_DROPS) {
        throw new Error(`All ${MAX_HOMEPAGE_DROPS} Just Dropped slots are already filled. Edit or remove a slot first.`);
      }
      const sortOrder = Math.max(0, ...(data ?? []).map((r) => r.sort_order)) + 1;
      const { error } = await supabase.from("homepage_drops").insert({ ...row, sort_order: sortOrder });
      if (error) throw new Error(error.message);
    }

    revalidatePath("/home");
    revalidatePath("/admin/homepage-drops");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

export async function moveHomepageDrop(id: string, direction: "up" | "down"): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const dropId = validUuid(id);
    const parsedDirection = z.enum(["up", "down"]).safeParse(direction);
    if (!parsedDirection.success) throw new Error("Invalid move direction.");

    const { data, error } = await supabase
      .from("homepage_drops")
      .select("id, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const index = rows.findIndex((row) => row.id === dropId);
    const nextIndex = parsedDirection.data === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= rows.length) return ok();

    const current = rows[index];
    const adjacent = rows[nextIndex];
    const temporaryOrder = -Date.now();
    const first = await supabase.from("homepage_drops").update({ sort_order: temporaryOrder }).eq("id", current.id);
    if (first.error) throw new Error(first.error.message);
    const second = await supabase.from("homepage_drops").update({ sort_order: current.sort_order }).eq("id", adjacent.id);
    if (second.error) throw new Error(second.error.message);
    const third = await supabase.from("homepage_drops").update({ sort_order: adjacent.sort_order }).eq("id", current.id);
    if (third.error) throw new Error(third.error.message);

    revalidatePath("/home");
    revalidatePath("/admin/homepage-drops");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

/** Turns the carousel's daily shuffle on or off. */
export async function setHomepageDropsShuffle(on: boolean): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    if (typeof on !== "boolean") throw new Error("Invalid setting.");
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: HOMEPAGE_DROPS_SHUFFLE_KEY, value: on, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
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

// ── Product code letters (Products → Settings) ──────────────────────────────

const codeLetterSchema = z.object({
  letter: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]$/, "Use a single letter, A to Z."),
  name: z.string().trim().min(1, "Give the letter a name, e.g. Bags.").max(60, "Keep the name under 60 characters."),
  category: z.string().trim().min(1, "Choose a category.").max(60),
});

/**
 * Gives a category its code letter. Products already in that category are
 * coded straight away, oldest first; new ones get the next number when saved.
 */
export async function createCodeLetter(input: { letter: string; name: string; category: string }): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const parsed = codeLetterSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };

    // A category typed in here that doesn't exist yet is created first, so a
    // new category and its letter are set up in one go.
    const { data: existing, error: listError } = await supabase.from("categories").select("name, sort_order");
    if (listError) throw new Error(listError.message);
    const match = existing?.find((c) => c.name.trim().toLowerCase() === parsed.data.category.toLowerCase());
    if (match) {
      parsed.data.category = match.name;
    } else {
      const nextOrder = Math.max(0, ...(existing ?? []).map((c) => c.sort_order)) + 1;
      const { error: categoryError } = await supabase
        .from("categories")
        .insert({ name: parsed.data.category, show_in_filter: true, sort_order: nextOrder });
      if (categoryError) throw new Error(categoryError.message);
      revalidateCategories();
    }

    const { error } = await supabase.from("code_prefixes").insert({
      letter: parsed.data.letter,
      name: parsed.data.name,
      category: parsed.data.category,
    });
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          error: error.message.includes("category")
            ? `"${parsed.data.category}" already has a letter.`
            : `Letter ${parsed.data.letter} is already taken.`,
        };
      }
      throw new Error(error.message);
    }

    revalidatePath("/admin/products/settings");
    revalidatePath("/admin/products");
    return ok();
  } catch (err) {
    return fail(err);
  }
}

// ── Product import (CSV / Excel) ────────────────────────────────────────────

const MAX_IMPORT_ROWS = 500;

export interface ImportRowResult {
  row: number;
  name: string;
  ok: boolean;
  code?: string | null;
  error?: string;
}

function slugifyName(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "product"
  );
}

function splitList(value: string): string[] {
  return [...new Set(value.split(/[,;|]/).map((v) => v.trim()).filter(Boolean))].slice(0, 24);
}

/**
 * Creates products from spreadsheet rows. Every row is checked on its own, so
 * one bad row never blocks the rest; each gets back its new product code or
 * the reason it was skipped. Imported products are always **unpublished** and
 * have no photos — add photos, then publish, from the product list.
 */
export async function importProducts(
  rows: Record<string, unknown>[]
): Promise<{ ok: true; results: ImportRowResult[] } | { ok: false; error: string }> {
  try {
    const supabase = await requireAdmin();
    if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: "The file has no product rows." };
    if (rows.length > MAX_IMPORT_ROWS) {
      return { ok: false, error: `Import at most ${MAX_IMPORT_ROWS} products at a time.` };
    }

    const [{ data: categoryRows }, { data: existing }] = await Promise.all([
      supabase.from("categories").select("name"),
      supabase.from("products").select("id"),
    ]);
    const categories = new Map((categoryRows ?? []).map((c) => [c.name.trim().toLowerCase(), c.name]));
    const takenSlugs = new Set((existing ?? []).map((p) => p.id));

    const results: ImportRowResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // spreadsheet row, after the header
      const raw = rows[i] ?? {};
      const name = String(raw.name ?? "").trim();
      const parsed = productImportRowSchema.safeParse(raw);
      if (!parsed.success) {
        results.push({ row: rowNumber, name, ok: false, error: parsed.error.issues[0]?.message ?? "Invalid row." });
        continue;
      }
      const r = parsed.data;

      const category = categories.get(r.category.trim().toLowerCase());
      if (!category) {
        results.push({
          row: rowNumber,
          name: r.name,
          ok: false,
          error: `Unknown category "${r.category}". Use one of: ${[...categories.values()].join(", ")} — or add it first.`,
        });
        continue;
      }
      if (r.wasPrice !== undefined && r.wasPrice < r.price) {
        results.push({ row: rowNumber, name: r.name, ok: false, error: "Was price must be higher than the price." });
        continue;
      }

      // A unique URL slug from the name: "silk-scarf", then "silk-scarf-2"…
      const base = slugifyName(r.name);
      let slug = base;
      for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`;
      takenSlugs.add(slug);

      const { data: created, error } = await supabase
        .from("products")
        .insert({
          id: slug,
          name: r.name,
          description: r.description ?? null,
          price: r.price,
          original_price: r.wasPrice ?? null,
          category,
          gender: r.for,
          stock: r.quantity,
          sizes: splitList(r.sizes),
          colors: splitList(r.colors),
          images: [],
          active: false,
        })
        .select("code")
        .maybeSingle();

      if (error) {
        results.push({ row: rowNumber, name: r.name, ok: false, error: error.message });
      } else {
        results.push({ row: rowNumber, name: r.name, ok: true, code: created?.code ?? null });
      }
    }

    revalidatePath("/admin/products");
    revalidatePath("/admin/products/settings");
    return { ok: true, results };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
