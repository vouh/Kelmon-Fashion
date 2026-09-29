import AppShell from "@/components/layout/AppShell";
import ProfileClient, { type ProfileOrder } from "@/components/profile/ProfileClient";
import { getUserOrders } from "@/lib/supabase/orders";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata = { title: "My Account", ...PRIVATE_PAGE };

/**
 * Depends on the caller's session, so it can never be prerendered — the order
 * list and points balance belong to one account.
 */
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const rows = await getUserOrders();

  const orders: ProfileOrder[] = rows.map((order) => ({
    id: order.id,
    createdAt: order.created_at,
    dropPoint: order.drop_point,
    total: Number(order.total),
    status: order.status,
    paid: order.payment_status === "paid",
    pointsEarned: order.points_earned,
    lines: (order.order_items ?? []).map((line) => ({
      name: line.name,
      quantity: line.quantity,
      price: Number(line.price),
    })),
  }));

  return (
    <AppShell activeNav="profile">
      <ProfileClient orders={orders} />
    </AppShell>
  );
}
