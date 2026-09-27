# Architecture Overview

## Components

Kelmon is a single Next.js 15 application (App Router) backed by Supabase. There
is no separate backend service and no separate admin app — a deliberate change
from the pre-merge state, where the storefront and the admin panel were
different codebases on different hosts.

```
┌──────────────────────────── Next.js app ─────────────────────────────┐
│                                                                      │
│  Storefront (public)          Admin (/admin, gated)                  │
│  /  /shop  /product/[id]      /admin            /admin/products      │
│  /salon  /cart  /checkout     /admin/orders     /admin/stats         │
│  /orders  /profile  /signin   /admin/deals      /admin/updates       │
│  /about  /contact             /admin/reviews    /admin/transactions   │
│                                                                      │
│  ── middleware.ts ── session refresh + /admin gate on every request   │
│                                                                      │
│  Route handlers                Server Actions                        │
│  /api/orders                   app/admin/actions.ts                  │
│  /api/mpesa/stk-push           (all admin writes)                    │
│  /api/mpesa/callback                                                 │
│  /auth/callback                                                      │
└──────────┬──────────────────────────────────┬────────────────────────┘
           │                                  │
           ▼                                  ▼
 ┌──────────────────┐              ┌─────────────────────┐
 │    Supabase      │              │  Safaricom Daraja   │
 │  Postgres + RLS  │              │     (M-Pesa)        │
 │  Auth (Google)   │◄─── callback ┤   STK Push          │
 │  Storage         │              └─────────────────────┘
 └──────────────────┘
```

## Request flow

### Reading the catalogue
Server Components call `lib/supabase/products.ts`, which queries Supabase with
the caller's session. RLS restricts rows to `active = true` for anonymous
visitors. The row is mapped to the storefront's `Product` shape by
`productFromRow()` in `lib/products.ts`, so presentation components never see
database column names.

### Placing an order
1. `app/checkout/page.tsx` POSTs the cart to `/api/orders`.
2. The route **re-prices every line** against the `products` table and
   recomputes the delivery fee. Client-supplied money is discarded.
3. `createOrder()` inserts the order and its `order_items` as the signed-in
   user. The RLS insert policy pins `status='pending'` and
   `payment_status='unpaid'`.
4. If paying by M-Pesa, the client POSTs to `/api/mpesa/stk-push`, which reads
   the amount **from the order row**, not the request.
5. Safaricom calls `/api/mpesa/callback`. That handler uses the service-role
   client (no user session exists) to mark the order paid and award loyalty
   points.

### Reaching the admin panel
Three independent checks, in order:

1. `middleware.ts` — redirects non-admins before any admin markup is generated.
2. `app/admin/layout.tsx` — re-checks server-side on every nested route.
3. Each Server Action in `app/admin/actions.ts` calls `requireAdmin()`.

RLS would reject an unauthorised write regardless; the layers above exist so
failures are explicit and so admin HTML never reaches a non-admin browser. The
old EzyBite panel did this client-side — it shipped the full admin page, then
hid it behind an overlay while Firebase resolved the session.

## Why one app instead of two

| Before | Now |
|---|---|
| Storefront on Netlify, API on Vercel | One deployment |
| Wildcard CORS on `/api/*` to bridge origins | Same origin, no CORS |
| Admin gate in browser JavaScript | Gate in middleware + server layout |
| Admin auth separate from storefront auth | One session |
| Product catalogue hardcoded in two places | One `products` table |

## Directory layout

```
app/
  (storefront routes)
  admin/            gated admin routes
  admin/actions.ts  admin mutations (Server Actions)
  api/              route handlers
  auth/callback/    OAuth code exchange
components/
  admin/            AdminShell, per-screen managers, BarChart
  providers/        Auth, Cart, Theme, Toast
  home|shop|product|layout|salon|orders|ui/
lib/
  supabase/         client, server, types, and one module per domain
  mpesa.ts          STK Push
  products.ts       Product type, row mapper, formatKes
  cart.ts           cart maths, delivery-fee rule, variant options
  dev-auth.ts       development-only login fallback
  dev-fixtures.ts   development-only sample data
middleware.ts
supabase/
  migrations/       schema
  seed.sql          sample catalogue + first admin grant
docs/
```

## Data-layer conventions

Every read function in `lib/supabase/` follows the same shape:

```ts
export async function getThing(): Promise<Thing[]> {
  if (isDevAuthEnabled()) return devThings;   // local review only
  if (!isSupabaseConfigured()) return [];     // degrade, never throw
  const supabase = await createClient();
  const { data, error } = await supabase.from("things").select("*");
  if (error) { console.error("[things] getThing:", error.message); return []; }
  return data ?? [];
}
```

Two properties this buys:

- **A fresh clone runs.** With no `.env.local`, pages render empty instead of
  crashing, so the app is reviewable before any infrastructure exists.
- **A read failure degrades rather than 500s.** A broken RLS policy shows an
  empty shop, not an error page, and logs the cause.

Writes behave the opposite way: they throw or return
`{ ok: false, error }`, because silently dropping a write is worse than failing
loudly.

## Client/server split

Server Components do all data fetching. Client Components receive data as props
and own only interaction state. Two consequences worth knowing:

- **Functions cannot be passed as props** from a Server to a Client Component.
  `BarChart` takes `valueFormat="kes"` rather than a formatter function for
  exactly this reason.
- `SearchOverlay` is the one exception to prop-drilling: it sits inside
  `AppShell` on every page, so it loads its own catalogue from the browser
  client the first time it opens, rather than having products threaded through
  the shell.

## See also

- [Architecture Decision Records](decisions/) — why Supabase Auth, why a single
  store, why the admin panel was rewritten in React
- [Database schema](../database/schema.md)
- [Security model](../security/security-model.md)
