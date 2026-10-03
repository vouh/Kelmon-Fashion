import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { OrderRow } from "@/lib/supabase/types";

/**
 * Admin dashboard aggregates.
 * Ports fb_getAdminStats and fb_getOrdersWithStats from js/firebase-service.js.
 */

export interface AdminStats {
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  pendingOrders: number;
}

export interface DayBucket {
  label: string;
  date: string;
  count: number;
  revenue: number;
}

export interface OrdersWithStats {
  orders: OrderRow[];
  days: DayBucket[];
  paid: number;
  failed: number;
  unpaid: number;
}

const EMPTY_STATS: AdminStats = {
  totalOrders: 0,
  totalUsers: 0,
  totalRevenue: 0,
  pendingOrders: 0,
};

export async function getAdminStats(): Promise<AdminStats> {
  if (!isSupabaseConfigured()) return EMPTY_STATS;
  const supabase = await createClient();

  // head:true returns only the count, so these two never transfer rows.
  const [orders, users] = await Promise.all([
    supabase.from("orders").select("total, status, payment_status"),
    // Clients only: admin and super admin accounts aren't customers.
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
  ]);

  if (orders.error) {
    console.error("[stats] getAdminStats:", orders.error.message);
    return EMPTY_STATS;
  }

  let totalRevenue = 0;
  let pendingOrders = 0;

  for (const order of orders.data ?? []) {
    // Revenue counts paid orders only — same rule as the old dashboard.
    if (order.payment_status === "paid") totalRevenue += Number(order.total);
    if (order.status === "pending" || order.payment_status === "unpaid") pendingOrders += 1;
  }

  return {
    totalOrders: orders.data?.length ?? 0,
    totalUsers: users.count ?? 0,
    totalRevenue,
    pendingOrders,
  };
}

/** Orders plus a 7-day bucket series for the stats charts. */
export async function getOrdersWithStats(): Promise<OrdersWithStats> {
  const empty: OrdersWithStats = { orders: [], days: [], paid: 0, failed: 0, unpaid: 0 };

  if (!isSupabaseConfigured()) return empty;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[stats] getOrdersWithStats:", error.message);
    return empty;
  }
  const orders: OrderRow[] = data ?? [];

  // Last 7 days, oldest first.
  const days: DayBucket[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString("en-KE", { weekday: "short" }),
      date: d.toDateString(),
      count: 0,
      revenue: 0,
    });
  }

  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const order of orders) {
    const bucket = byDate.get(new Date(order.created_at).toDateString());
    if (bucket) {
      bucket.count += 1;
      bucket.revenue += Number(order.total);
    }
  }

  return {
    orders,
    days,
    paid: orders.filter((o) => o.payment_status === "paid").length,
    failed: orders.filter((o) => o.payment_status === "failed").length,
    unpaid: orders.filter((o) => o.payment_status === "unpaid").length,
  };
}
