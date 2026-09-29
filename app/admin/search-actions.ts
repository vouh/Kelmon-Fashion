"use server";

import { searchAnchor } from "@/lib/admin-search";
import { createClient, createServiceClient, getAdminAccess } from "@/lib/supabase/server";

/**
 * Backs the admin topbar search. Looks across everything an admin can open
 * and returns a few matches per kind, each with the page that shows it.
 */

export type SearchKind =
  | "order"
  | "product"
  | "account"
  | "category"
  | "deal"
  | "update"
  | "review"
  | "message"
  | "drop";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const PER_KIND = 5;

/**
 * PostgREST's `or=` filter is a comma/parenthesis mini-language, so those (and
 * the LIKE wildcards) are stripped rather than escaped. What remains still
 * covers names, emails, phones, order ids and receipts.
 */
function cleanTerm(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const term = raw.replace(/[^\p{L}\p{N}@.+\-_ ]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return term.length >= 2 ? term : null;
}

function kes(amount: number): string {
  return `KES ${Number(amount).toLocaleString("en-KE")}`;
}

export async function searchAdmin(query: unknown): Promise<SearchHit[]> {
  const access = await getAdminAccess();
  if (!access) return [];
  const term = cleanTerm(query);
  if (!term) return [];

  // Service role when available: an admin whose hour-long token lapsed is
  // still verified above, but would read nothing through RLS.
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : await createClient();
  const pattern = `*${term}*`;
  const digits = term.replace(/\D/g, "");
  // Phones are stored as 2547…; "0712…" should still find them.
  const phonePattern = digits.length >= 3 ? `*${digits.replace(/^0/, "")}*` : null;

  /** `col1.ilike."*term*",col2…` — quoted so spaces in the term survive. */
  const anyOf = (...columns: (string | null)[]) =>
    columns
      .filter((column): column is string => Boolean(column))
      .map((column) => (column === "phone" ? `phone.ilike."${phonePattern}"` : `${column}.ilike."${pattern}"`))
      .join(",");
  const phone = phonePattern ? "phone" : null;

  const [orders, products, accounts, categories, deals, updates, reviews, messages, drops] = await Promise.all([
    db
      .from("orders")
      .select("id, customer_name, phone, total, status, payment_status")
      .or(anyOf("id", "customer_name", "mpesa_receipt_number", phone))
      .order("created_at", { ascending: false })
      .limit(PER_KIND),
    db
      .from("products")
      .select("id, name, code, category, price, active")
      .or(anyOf("name", "code", "id", "category"))
      .limit(PER_KIND),
    access.superAdmin
      ? db
          .from("profiles")
          .select("id, full_name, email, phone, role")
          .or(anyOf("full_name", "email", phone))
          .limit(PER_KIND)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null; phone: string | null; role: string }[] }),
    db.from("categories").select("name").or(anyOf("name")).limit(PER_KIND),
    db.from("deals").select("id, title, code, active").or(anyOf("title", "code")).limit(PER_KIND),
    db.from("updates").select("id, title, tag").or(anyOf("title", "body", "tag")).limit(PER_KIND),
    db
      .from("reviews")
      .select("id, author_name, rating, body")
      .or(anyOf("author_name", "body"))
      .order("created_at", { ascending: false })
      .limit(PER_KIND),
    db
      .from("contact_messages")
      .select("id, first_name, last_name, email, message")
      .or(anyOf("first_name", "last_name", "email", "message"))
      .order("created_at", { ascending: false })
      .limit(PER_KIND),
    db.from("homepage_drops").select("id, name, category, price").or(anyOf("name", "category")).limit(PER_KIND),
  ]);

  for (const [kind, result] of Object.entries({ orders, products, categories, deals, updates, reviews, messages, drops })) {
    if (result.error) console.error(`[admin search] ${kind}:`, result.error.message);
  }

  const hits: SearchHit[] = [];

  for (const o of orders.data ?? []) {
    hits.push({
      kind: "order",
      id: o.id,
      title: `${o.id} · ${o.customer_name}`,
      subtitle: `${kes(o.total)} · ${o.status.replace(/_/g, " ")} · ${o.payment_status}`,
      href: `/admin/orders?q=${encodeURIComponent(o.id)}#${searchAnchor("order", o.id)}`,
    });
  }
  for (const p of products.data ?? []) {
    hits.push({
      kind: "product",
      id: p.id,
      title: p.name,
      subtitle: [p.code, p.category, kes(p.price), p.active ? null : "hidden"].filter(Boolean).join(" · "),
      href: `/admin/products?edit=${encodeURIComponent(p.id)}`,
    });
  }
  for (const a of accounts.data ?? []) {
    hits.push({
      kind: "account",
      id: a.id,
      title: a.full_name || a.email || "Account",
      subtitle: [a.email, a.phone, a.role === "admin" ? "admin" : null].filter(Boolean).join(" · "),
      href: `/admin/accounts/${encodeURIComponent(a.id)}`,
    });
  }
  for (const c of categories.data ?? []) {
    hits.push({ kind: "category", id: c.name, title: c.name, subtitle: "Category", href: `/admin/categories#${searchAnchor("category", c.name)}` });
  }
  for (const d of deals.data ?? []) {
    hits.push({
      kind: "deal",
      id: d.id,
      title: d.title,
      subtitle: [d.code ? `Code ${d.code}` : null, d.active ? "active" : "inactive"].filter(Boolean).join(" · "),
      href: `/admin/deals#${searchAnchor("deal", d.id)}`,
    });
  }
  for (const u of updates.data ?? []) {
    hits.push({ kind: "update", id: u.id, title: u.title, subtitle: u.tag ?? "Update", href: `/admin/updates#${searchAnchor("update", u.id)}` });
  }
  for (const r of reviews.data ?? []) {
    hits.push({
      kind: "review",
      id: r.id,
      title: `${r.author_name} · ${"★".repeat(r.rating)}`,
      subtitle: r.body?.slice(0, 80) ?? "No comment",
      href: `/admin/reviews#${searchAnchor("review", r.id)}`,
    });
  }
  for (const m of messages.data ?? []) {
    hits.push({
      kind: "message",
      id: m.id,
      title: `${m.first_name} ${m.last_name}`.trim(),
      subtitle: `${m.email} · ${m.message.slice(0, 60)}`,
      href: `/admin/communications?open=${encodeURIComponent(m.id)}#${searchAnchor("message", m.id)}`,
    });
  }
  for (const d of drops.data ?? []) {
    hits.push({
      kind: "drop",
      id: d.id,
      title: d.name,
      subtitle: `Homepage drop · ${d.category} · ${kes(d.price)}`,
      href: `/admin/homepage-drops#${searchAnchor("drop", d.id)}`,
    });
  }

  return hits;
}
