import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { InventoryItemRow, InventoryRow } from "@/lib/supabase/types";

/**
 * Reads for the admin Finance page. Only ever called under app/admin, whose
 * layout has already checked the caller is an admin — so the service role is
 * used when available, for the same lapsed-token reason as the admin actions.
 */

export interface InventoryWithItems extends InventoryRow {
  items: InventoryItemRow[];
}

/** A paid shop order, for comparing bought stock against online sales. */
export interface PaidSale {
  total: number;
  at: string;
}

async function db() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : await createClient();
}

export async function getInventories(): Promise<InventoryWithItems[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await db();
  const [inventories, items] = await Promise.all([
    supabase
      .from("inventories")
      .select("*")
      .order("purchased_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("inventory_items").select("*").order("created_at", { ascending: true }),
  ]);
  if (inventories.error || items.error) {
    // PGRST205: the migration hasn't been applied yet — show an empty page.
    const error = inventories.error ?? items.error;
    if (error?.code !== "PGRST205") console.error("[finance] getInventories:", error?.message);
    return [];
  }

  const byInventory = new Map<string, InventoryItemRow[]>();
  for (const row of items.data ?? []) {
    const item = {
      ...row,
      buy_price: Number(row.buy_price),
      sell_price: Number(row.sell_price),
    };
    const list = byInventory.get(item.inventory_id);
    if (list) list.push(item);
    else byInventory.set(item.inventory_id, [item]);
  }
  return (inventories.data ?? []).map((inv) => ({ ...inv, items: byInventory.get(inv.id) ?? [] }));
}

/** Product id → what one piece cost the shop. */
export async function getProductCosts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {};
  const supabase = await db();
  const { data, error } = await supabase.from("product_costs").select("product_id, buy_price");
  if (error) {
    if (error.code !== "PGRST205") console.error("[finance] getProductCosts:", error.message);
    return {};
  }
  return Object.fromEntries((data ?? []).map((row) => [row.product_id, Number(row.buy_price)]));
}

export async function getPaidSales(): Promise<PaidSale[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await db();
  const { data, error } = await supabase
    .from("orders")
    .select("total, paid_at, updated_at")
    .eq("payment_status", "paid");
  if (error) {
    console.error("[finance] getPaidSales:", error.message);
    return [];
  }
  return (data ?? []).map((o) => ({ total: Number(o.total), at: o.paid_at ?? o.updated_at }));
}
