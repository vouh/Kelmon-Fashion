import "server-only";

import { accountRole, type AccountRole } from "@/lib/auth/roles";
import { isProtectedAccount } from "@/lib/auth/protected-accounts";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { createServiceClient } from "@/lib/supabase/server";
import type { OrderWithItems } from "@/lib/supabase/orders";
import type { PaymentFailureRow, ProfileRow } from "@/lib/supabase/types";

/**
 * Reads for the admin Accounts page: every profile with its order and payment
 * totals. Uses the service role, so callers must have checked for a super
 * admin first (app/admin/accounts/* do, via getAdminAccess).
 */

export interface AccountSummary {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  campus: string | null;
  avatarUrl: string | null;
  role: AccountRole;
  owner: boolean;
  loyaltyPoints: number;
  createdAt: string;
  orders: number;
  paidPayments: number;
  failedPayments: number;
  /** Sum of paid orders. */
  spent: number;
  lastOrderAt: string | null;
  /** Invited but hasn't set a password (no sign-in method yet). */
  pendingInvite: boolean;
  lastSignInAt: string | null;
}

type OrderStub = { id: string; user_id: string | null; total: number; payment_status: string; created_at: string };

/** PostgREST caps a response at 1000 rows, so read in pages. */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const size = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

/** Sign-in status from Firebase, keyed by uid. Missing entries just show as unknown. */
async function firebaseStatus(uids: string[]): Promise<Map<string, { pending: boolean; lastSignInAt: string | null }>> {
  const status = new Map<string, { pending: boolean; lastSignInAt: string | null }>();
  if (!isFirebaseAdminConfigured() || uids.length === 0) return status;
  try {
    for (let i = 0; i < uids.length; i += 100) {
      const { users } = await getAdminAuth().getUsers(uids.slice(i, i + 100).map((uid) => ({ uid })));
      for (const user of users) {
        status.set(user.uid, {
          pending: user.providerData.length === 0,
          lastSignInAt: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toISOString() : null,
        });
      }
    }
  } catch (error) {
    console.error("[accounts] firebase status:", error);
  }
  return status;
}

function summarise(
  profile: ProfileRow,
  orders: OrderStub[],
  failuresByOrder: Map<string, number>,
  firebase: { pending: boolean; lastSignInAt: string | null } | undefined
): AccountSummary {
  const paid = orders.filter((o) => o.payment_status === "paid");
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    phone: profile.phone,
    campus: profile.campus,
    avatarUrl: profile.avatar_url,
    role: accountRole(profile),
    owner: isProtectedAccount(profile.email),
    loyaltyPoints: profile.loyalty_points,
    createdAt: profile.created_at,
    orders: orders.length,
    paidPayments: paid.length,
    failedPayments: orders.reduce((sum, o) => sum + (failuresByOrder.get(o.id) ?? 0), 0),
    spent: paid.reduce((sum, o) => sum + Number(o.total), 0),
    lastOrderAt: orders.reduce<string | null>((latest, o) => (!latest || o.created_at > latest ? o.created_at : latest), null),
    pendingInvite: firebase?.pending ?? false,
    lastSignInAt: firebase?.lastSignInAt ?? null,
  };
}

export async function getAccounts(): Promise<AccountSummary[]> {
  const db = createServiceClient();
  const [profiles, orders, failures] = await Promise.all([
    readAll<ProfileRow>((from, to) => db.from("profiles").select("*").order("created_at", { ascending: false }).range(from, to)),
    readAll<OrderStub>((from, to) =>
      db.from("orders").select("id, user_id, total, payment_status, created_at").not("user_id", "is", null).range(from, to)
    ),
    readAll<{ order_id: string | null }>((from, to) =>
      db.from("payment_failures").select("order_id").not("order_id", "is", null).range(from, to)
    ),
  ]);

  const failuresByOrder = new Map<string, number>();
  for (const f of failures) {
    if (f.order_id) failuresByOrder.set(f.order_id, (failuresByOrder.get(f.order_id) ?? 0) + 1);
  }
  const ordersByUser = new Map<string, OrderStub[]>();
  for (const o of orders) {
    if (!o.user_id) continue;
    ordersByUser.set(o.user_id, [...(ordersByUser.get(o.user_id) ?? []), o]);
  }

  const firebase = await firebaseStatus(profiles.map((p) => p.id));
  return profiles.map((p) => summarise(p, ordersByUser.get(p.id) ?? [], failuresByOrder, firebase.get(p.id)));
}

export interface AccountDetail {
  account: AccountSummary;
  orders: OrderWithItems[];
  failures: PaymentFailureRow[];
}

export async function getAccount(id: string): Promise<AccountDetail | null> {
  const db = createServiceClient();
  const { data: profile, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) return null;

  const { data: orders, error: ordersError } = await db
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });
  if (ordersError) throw new Error(ordersError.message);

  const orderIds = (orders ?? []).map((o) => o.id);
  let failures: PaymentFailureRow[] = [];
  if (orderIds.length > 0) {
    const { data, error: failuresError } = await db
      .from("payment_failures")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false });
    if (failuresError) throw new Error(failuresError.message);
    failures = data ?? [];
  }

  const failuresByOrder = new Map<string, number>();
  for (const f of failures) {
    if (f.order_id) failuresByOrder.set(f.order_id, (failuresByOrder.get(f.order_id) ?? 0) + 1);
  }
  const firebase = await firebaseStatus([id]);

  return {
    account: summarise(profile, orders ?? [], failuresByOrder, firebase.get(id)),
    orders: (orders ?? []) as OrderWithItems[],
    failures,
  };
}
