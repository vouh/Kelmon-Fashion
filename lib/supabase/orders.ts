import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { CartLine } from "@/lib/cart";
import type { Database, OrderItemRow, OrderRow, PaymentMethod } from "@/lib/supabase/types";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { devOrders } from "@/lib/dev-fixtures";

/** Columns an order update may touch (excludes created_at/updated_at). */
export type OrderPatch = Database["public"]["Tables"]["orders"]["Update"];

/**
 * Order reads and writes.
 *
 * Ports fb_createOrder, fb_getUserOrders, fb_getAllOrders, fb_updateOrderStatus,
 * fb_deleteOrder, fb_createDirectOrder and fb_getOrdersWithStats from
 * js/firebase-service.js.
 */

export interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
}

/** Human-readable id, unchanged from the old createOrderId() in lib/orders.ts. */
export function createOrderId(): string {
  return `KM-${Date.now().toString(36).toUpperCase()}`;
}

export interface NewOrderInput {
  customerName: string;
  phone: string;
  dropPoint: string;
  campus?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/**
 * Creates an order plus its line items for the signed-in user.
 *
 * The RLS insert policy pins status/payment_status to pending/unpaid, so a
 * client cannot open an order that claims to be already paid.
 */
export async function createOrder(input: NewOrderInput): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You must be signed in to place an order.");

  const id = createOrderId();

  const { error: orderError } = await supabase.from("orders").insert({
    id,
    user_id: auth.user.id,
    customer_name: input.customerName,
    phone: input.phone,
    drop_point: input.dropPoint,
    campus: input.campus ?? null,
    notes: input.notes ?? null,
    payment_method: input.paymentMethod,
    subtotal: input.subtotal,
    delivery_fee: input.deliveryFee,
    total: input.total,
    status: "pending",
    payment_status: "unpaid",
    source: "storefront",
    points_awarded: false,
  });
  if (orderError) throw new Error(orderError.message);

  const { error: itemsError } = await supabase.from("order_items").insert(
    input.lines.map((line) => ({
      order_id: id,
      product_id: line.productId,
      name: line.name,
      price: line.price,
      quantity: line.quantity,
      variant: line.variant ?? null,
      image: line.image,
      category: line.category,
    }))
  );

  if (itemsError) {
    // Don't leave a headless order behind if the items fail to land.
    await supabase.from("orders").delete().eq("id", id);
    throw new Error(itemsError.message);
  }

  return id;
}

/** The signed-in user's orders, newest first. Ports fb_getUserOrders. */
export async function getUserOrders(): Promise<OrderWithItems[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[orders] getUserOrders:", error.message);
    return [];
  }
  return (data ?? []) as OrderWithItems[];
}

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[orders] getOrderById:", error.message);
    return null;
  }
  return (data as OrderWithItems) ?? null;
}

/** Every order. Admin-only by RLS. Ports fb_getAllOrders. */
export async function getAllOrders(): Promise<OrderWithItems[]> {
  if (isDevAuthEnabled()) return devOrders;
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[orders] getAllOrders:", error.message);
    return [];
  }
  return (data ?? []) as OrderWithItems[];
}

/**
 * Looks up an order by its M-Pesa CheckoutRequestID and applies a patch.
 * Uses the service-role client because the Safaricom callback arrives with no
 * user session. Ports the Firestore write in api/callback.js.
 */
export async function updateOrderByCheckoutId(
  checkoutRequestId: string,
  patch: OrderPatch
): Promise<string | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("mpesa_checkout_request_id", checkoutRequestId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[orders] updateOrderByCheckoutId:", error.message);
    return null;
  }
  return data?.id ?? null;
}

/** Service-role patch by order id, for the STK push initiation path. */
export async function updateOrderByIdAsService(
  id: string,
  patch: OrderPatch
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Awards loyalty points for a paid order. Idempotent inside Postgres. */
export async function awardLoyaltyPoints(orderId: string): Promise<number> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("award_loyalty_points", {
    p_order_id: orderId,
  });
  if (error) {
    console.error("[orders] awardLoyaltyPoints:", error.message);
    return 0;
  }
  return data ?? 0;
}
