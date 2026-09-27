# Architecture

The complete architecture and design of the Kelmon platform: what the system is
made of, how a request flows through it, and why each significant decision was
made the way it was.

**Current as of:** 2026-09-27, after the EzyBite backend merge.

---

## Contents

- [System shape](#system-shape)
- [Request flows](#request-flows)
- [Directory layout](#directory-layout)
- [Layer conventions](#layer-conventions)
- [Client and server split](#client-and-server-split)
- [Design decisions](#design-decisions)
  - [1. Supabase Auth over Firebase Auth](#1-supabase-auth-over-firebase-auth)
  - [2. Single-store catalogue, not multi-vendor](#2-single-store-catalogue-not-multi-vendor)
  - [3. Admin panel rewritten in Next.js](#3-admin-panel-rewritten-in-nextjs)
  - [4. Orders re-priced server-side](#4-orders-re-priced-server-side)
  - [5. Development-only auth fallback](#5-development-only-auth-fallback)
- [What this replaced](#what-this-replaced)

---

## System shape

Kelmon is a single Next.js 15 application (App Router) backed by Supabase. There
is no separate backend service and no separate admin app — a deliberate change
from the pre-merge state, where the storefront and admin panel were different
codebases on different hosts.

```
┌──────────────────────────── Next.js app ─────────────────────────────┐
│                                                                      │
│  Storefront (public)          Admin (/admin, gated)                  │
│  /  /shop  /product/[id]      /admin            /admin/products      │
│  /salon  /cart  /checkout     /admin/orders     /admin/stats         │
│  /orders  /profile  /signin   /admin/deals      /admin/updates       │
│  /about  /contact             /admin/reviews    /admin/transactions  │
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

### Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript |
| Styling | Tailwind CSS v3 + CSS custom properties (`styles/design.css`) |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth — Google OAuth + email/password |
| File storage | Supabase Storage (`product-images` bucket) |
| Payments | M-Pesa STK Push (Safaricom Daraja) |

---

## Request flows

### Reading the catalogue

Server Components call `lib/supabase/products.ts`, which queries Supabase with
the caller's session. RLS restricts rows to `active = true` for anonymous
visitors. Rows are mapped to the storefront's `Product` shape by
`productFromRow()` in `lib/products.ts`, so presentation components never see
database column names — which is what let the storefront move from hardcoded
arrays to a database without touching a single card component.

### Placing an order

1. `app/checkout/page.tsx` POSTs the cart to `/api/orders`.
2. The route **re-prices every line** against the `products` table and
   recomputes the delivery fee. Client-supplied money is discarded
   ([decision 4](#4-orders-re-priced-server-side)).
3. `createOrder()` inserts the order and its `order_items` as the signed-in
   user. The RLS insert policy pins `status='pending'`,
   `payment_status='unpaid'`.
4. For M-Pesa, the client POSTs to `/api/mpesa/stk-push`, which reads the amount
   **from the order row**, not the request.
5. Safaricom calls `/api/mpesa/callback`. That handler uses the service-role
   client — no user session exists — to mark the order paid and award loyalty
   points.

### Reaching the admin panel

Four checks, in order:

| Layer | Where | Purpose |
|---|---|---|
| 1 | `middleware.ts` | Redirect before any admin markup is generated |
| 2 | `app/admin/layout.tsx` | Re-check on every nested route |
| 3 | `requireAdmin()` in `app/admin/actions.ts` | Server Actions are callable POST endpoints, invocable without loading a page |
| 4 | RLS policies | The actual guarantee — holds even if 1–3 are bypassed |

Layers 1–3 are redundant by design; layer 4 is what protects the data. The
anon key ships to the browser, so anyone can query the REST API directly —
route handlers are not the security boundary.

---

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
  supabase/         client, server, types, one module per domain
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

---

## Layer conventions

Every read function in `lib/supabase/` has the same shape:

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
  empty shop and logs the cause, instead of an error page.

Writes behave the opposite way — they throw, or return `{ ok: false, error }`.
Silently dropping a write is worse than failing loudly.

---

## Client and server split

Server Components do all data fetching. Client Components receive data as props
and own only interaction state. Three consequences worth knowing:

- **Functions cannot be passed as props** from a Server to a Client Component.
  `BarChart` takes `valueFormat="kes"` rather than a formatter function for
  exactly this reason; passing one is a build error.
- **`SearchOverlay` is the deliberate exception to prop-drilling.** It sits
  inside `AppShell` on every page, so threading products through the shell would
  touch every route. It loads its own catalogue from the browser client the first
  time it opens — one fetch per page load, only if used.
- **Admin routes are `force-dynamic`.** They depend on the caller's session and
  show live data, so they are never prerendered or cached.

---

## Design decisions

Each decision records the context, the options, what was chosen, and what it
costs. To change one, add a new entry rather than rewriting history — the
reasoning matters as much as the outcome.

---

### 1. Supabase Auth over Firebase Auth

**Status:** Accepted · 2026-09-27

#### Context

EzyBite used Firebase Auth (email/password + Google) with Firestore. Kelmon was
moving to Supabase Postgres. The question was whether to keep Firebase Auth
alongside Supabase, or move auth too.

The stated requirement was free Google sign-in. Both providers satisfy that, so
cost did not decide it.

#### Options

**A. Firebase Auth + Supabase Postgres.** Supabase RLS authorises by reading
claims from the JWT that Supabase Auth issued — `auth.uid()` resolves from that
token. A Firebase ID token is not that token. Making RLS work would require:

1. verifying the Firebase ID token server-side,
2. minting a second JWT signed with the Supabase JWT secret,
3. attaching it to every Supabase request,
4. keeping two user directories in step — a deletion or email change in Firebase
   must propagate, or RLS authorises against a stale identity.

Every policy then depends on that bridge. A bug in step 2 is an authorisation
bug across every table at once.

**B. Supabase Auth + Supabase Postgres.** One vendor issues the token and
enforces the policies. `auth.uid()` works directly. `auth.users` is the single
directory, and the `handle_new_user` trigger creates the matching `profiles` row.

Cost: existing Firebase users do not carry over — passwords are hashed and
cannot be migrated.

#### Decision

**Option B.**

Authorisation rules belong in the schema. With B, "a customer reads only their
own orders" is a policy in `0001_init.sql` that holds regardless of which code
path runs — a Server Component, a Server Action, or a raw query from the browser
console. With A the same guarantee depends on application glue being right
everywhere.

The migration cost is near zero in practice: Kelmon is a different product with
a different catalogue, and the EzyBite accounts were food-delivery customers.

#### Consequences

**Good**
- `auth.uid()` works natively; no token bridging or custom JWT signing.
- One user directory, no two-way sync.
- Authorisation reviewable in one SQL file.
- `profiles.role` drives admin access, replacing EzyBite's hardcoded
  `ADMIN_EMAILS` array in client-side JavaScript.

**Accepted costs**
- Existing Firebase accounts do not transfer.
- Vendor concentration — auth and data share a provider. Splitting them would
  not improve availability much, since the database is needed to serve anything.
- Google OAuth needs dashboard configuration not captured in code. Documented in
  [google-oauth.md](google-oauth.md).

**Bootstrapping consequence.** `profiles.role` is deliberately not
client-writable, so the first admin cannot be created through the app and must be
granted with the service role. See [environment.md](environment.md#first-admin).

---

### 2. Single-store catalogue, not multi-vendor

**Status:** Accepted · 2026-09-27

#### Context

"Campus fashion platform" can mean two very different products, and the
difference determines the schema: a shop Kelmon stocks and sells from, or a
marketplace where students list their own items.

Getting this wrong is expensive in one direction — retrofitting per-vendor
ownership onto orders and payouts after launch touches the schema, every RLS
policy, the admin panel and checkout.

#### Options

**A. Single store.** Kelmon owns all inventory. RLS stays simple: admins write
products, everyone reads active ones, customers read their own orders.

**B. Multi-vendor.** Adds `vendors`, `seller_id` on products, `vendor_id` on
order items, a `payouts` table, per-vendor RLS, order splitting when a cart spans
sellers, and a vendor dashboard. Payments get harder too: one STK Push collects
into one till, so revenue must be apportioned afterwards.

#### Decision

**Option A.** It matches how the ported EzyBite admin already worked — one
operator managing all orders — and it is the smaller correct thing to build
first.

#### Consequences

**Good**
- RLS stays legible; no per-vendor row filtering.
- Checkout and M-Pesa stay simple: one order, one payment, one recipient.
- The ported admin panel fits without modification.

**Accepted costs**
- No student sellers. If that becomes the product it is a real migration.

**Migration path**, designed for deliberately:

1. Add `vendors`, and nullable `vendor_id` to `products` and `order_items`.
2. Backfill every row to a single "Kelmon" vendor.
3. Make the columns `NOT NULL`.
4. Add per-vendor policies alongside the admin ones.

`order_items` already denormalises `name`, `price`, `image` and `category`, so an
order stays a faithful receipt after a product changes hands — exactly what
per-vendor accounting needs.

---

### 3. Admin panel rewritten in Next.js

**Status:** Accepted · 2026-09-27

#### Context

EzyBite's admin was nine static HTML files sharing `admin-shell.js` (sidebar
injected as a template string), `admin-auth.js` (the gate) and
`js/firebase-service.js` (data access via `window.fb_*` globals). It worked and
was in production.

The database was moving, so `firebase-service.js` had to be rewritten either
way. The question was only whether the *pages* stayed static HTML.

#### Options

**A. Keep static HTML, swap the data layer.** Move `admin/` to `public/admin/`
and replace `firebase-service.js` with a `supabase-service.js` exposing the same
function names, so the markup keeps working untouched. Cheapest, preserves the UI
exactly. But files in `public/` are static assets — no server-side gate is
possible, the admin session stays separate from the storefront's, and there are
no shared types, so the order shape can drift from the schema silently.

**B. Port to `app/admin/*` React routes.** More work; the markup is rebuilt.

#### Decision

**Option B.** The deciding factor is the gate. The original:

```js
// admin/admin-auth.js
const ADMIN_EMAILS = ['peterkelvinkibiru1532@gmail.com', 'sabastianthuo3@gmail.com'];
// inject a full-screen overlay, wait for Firebase, compare email, then reveal
setTimeout(() => { if (gateStillPresent) deny(); }, 10000);
```

Three structural problems, not fixable in place:

1. **The admin HTML is delivered to anyone who requests it.** The overlay hides
   it; it does not withhold it. View-source reveals the whole panel.
2. **The admin list is a client-side constant**, so adding an admin is a deploy,
   and the list of who has access is public.
3. **Nothing server-side is checking.** Any bug that removed the overlay early
   would expose the page.

Under A these stay true no matter how good the new data layer is. Under B the
check runs in middleware before markup is generated, again in the layout, again
in every Server Action — and the admin list becomes `profiles.role`, a database
value.

#### Consequences

**Good**
- Admin HTML never reaches a non-admin browser.
- Granting admin is a row update, not a deploy; the list is not public.
- One session for storefront and admin.
- Admin and storefront share `lib/supabase/types.ts`, so a schema change that
  breaks the panel fails at `tsc`, not at runtime.
- Mutations are Server Actions — no hand-written endpoints to secure.

**Accepted costs**
- The markup is a re-creation, not the original. Layout, spacing and the dark
  aesthetic were preserved; colours were rebranded from EzyBite orange to Kelmon
  purple deliberately.
- `window.confirm()` became a two-step inline confirm — a behaviour change.
  Native modals block the page and are awkward to automate.
- Chart.js (CDN) became an inline-SVG `BarChart`, removing a third-party runtime
  dependency but also its features. Only bar charts are supported now.

`admin/login.html` was not ported. Admins sign in at `/signin` and are routed by
role, so there is no second credential surface.

---

### 4. Orders re-priced server-side

**Status:** Accepted · 2026-09-27

#### Context

Two money-handling flaws were found in the pre-merge code while porting it.

**`/api/orders` stored client-supplied totals:**

```ts
const order: OrderRecord = {
  subtotal: body.subtotal,        // from the browser
  deliveryFee: body.deliveryFee,  // from the browser
  total: body.total,              // from the browser
  lines: body.lines,              // including each line's price
};
```

Nothing compared these against the catalogue. A crafted POST could create a
genuine order for an 8,500 KES bag with `total: 1`.

**`/api/mpesa/stk-push` charged a client-supplied amount:**

```ts
const { orderId, phone, amount } = body;
await initiateStkPush({ phone, amount, orderId });
```

The customer could approve a payment far smaller than the order, and the
callback would then mark that order fully paid.

Together, the amount charged and the amount owed were both under client control,
independently.

#### Options

**A. Validate on the client.** Worthless — client-side validation is UX, not a
control.

**B. Recompute and compare, rejecting on mismatch.** Produces false failures
whenever a price legitimately changes between page load and checkout.

**C. Recompute and ignore the client's figures entirely.** The client says
*what* is being bought; the server decides *what it costs*.

#### Decision

**Option C**, plus reading the M-Pesa amount from the stored order.

`/api/orders` now collects the distinct product ids, fetches those rows, rejects
if any is missing or inactive, rebuilds each line from **database** values
(keeping only quantity and variant from the client), and computes the subtotal
and fee itself.

`/api/mpesa/stk-push` no longer accepts `amount`. It selects the order — a query
RLS scopes to the caller's own orders, so this doubles as the authorisation
check — and charges `order.total`.

#### Consequences

**Good**
- Order value and charged amount both derive from server state only.
- A mid-session price change charges the current price rather than failing.
- Delisted products cannot be ordered (409).
- The RLS select means a user cannot start a payment against someone else's
  order without a separate ownership check.

**Accepted costs**
- One extra indexed query per checkout. Negligible.
- **A customer can be charged a different price than the one displayed**, if the
  catalogue changed mid-session. The server silently uses the new price. Logged
  in [known-issues.md](known-issues.md).

**Defence in depth.** The RLS insert policy independently pins the opening state:

```sql
create policy "orders: create own" on orders
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and payment_status = 'unpaid'
    and source = 'storefront'
    and points_awarded = false
  );
```

So even a compromised route handler running with the anon key cannot insert an
order claiming to be paid, or one pre-claiming loyalty points.

---

### 5. Development-only auth fallback

**Status:** Accepted · 2026-09-27

#### Context

The admin panel could not be reviewed without first creating a Supabase project,
applying migrations, configuring Google OAuth, signing in, and promoting a
profile with the service role. That is a long path before anyone can look at a
screen.

An initial attempt stored a test profile in `localStorage`. That cannot work for
`/admin`: the gate runs in `middleware.ts` and `app/admin/layout.tsx`, both
server-side, where `localStorage` is unreadable. The storefront appeared signed
in while `/admin` kept redirecting.

Deliberately adding an auth bypass to an app that handles payments needs
justification and hard limits.

#### Options

**A. No fallback.** Safest, but no one can see the admin panel without
provisioning infrastructure.

**B. A `NEXT_PUBLIC_DEV_ADMIN=true` flag.** Rejected — `NEXT_PUBLIC_*` is inlined
into the client bundle and settable in production as easily as locally. One
misconfigured variable would disable the admin gate in production.

**C. A cookie session gated on conditions that cannot both hold in production.**

#### Decision

**Option C.** `lib/dev-auth.ts` plus `/api/dev-auth`, enabled only when **both**
hold:

```ts
export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !supabaseConfigured();
}
```

A deployed build fails condition 1. A configured local server fails condition 2.
Both must fail for the bypass to be live, and adding real keys switches it off
with no code change.

Two further constraints:

- **The role is re-derived from the email server-side, never read from the
  cookie.** Editing it to `{"role":"admin"}` grants nothing.
- **The endpoint returns 404 when disabled**, not 403, so it does not advertise
  itself.

`lib/dev-fixtures.ts` supplies sample data on the same gate.

#### Verification

Checked against a real `next build && next start`, not reasoned about:

| Test | Expected | Result |
|---|---|---|
| `POST /api/dev-auth` in production | 404 | 404 |
| `/admin` + admin cookie in production | redirect | 307 |
| Forged cookie `{"role":"admin"}` in dev | refused | 307 |
| Non-admin email in dev | `customer` | refused |
| `admin@gmail.com` in dev | `admin` | 200 |

#### Consequences

**Good**
- Storefront and admin reviewable on a fresh clone.
- Switches off automatically when real keys are added.
- No production code path depends on it.

**Accepted costs**
- Auth-adjacent code exists whose only purpose is to be disabled in production.
  Confined to two `dev-*` files behind a single function.
- Writes do not persist in fallback mode — editing a product appears to do
  nothing. The sign-in screen states that nothing is saved.
- `DEV_ADMIN_EMAILS` is a hardcoded list, the same pattern criticised in
  [decision 3](#3-admin-panel-rewritten-in-nextjs). Acceptable only because it
  cannot execute in production.

**To remove:** delete `lib/dev-auth.ts`, `lib/dev-fixtures.ts`,
`app/api/dev-auth/route.ts`, and the `isDevAuthEnabled()` branches in
`middleware.ts`, `lib/supabase/server.ts`, `app/admin/layout.tsx` and each
`lib/supabase/*` read module. Nothing else depends on it.

---

## What this replaced

| Before | Now |
|---|---|
| Storefront on Netlify, API on Vercel | One deployment |
| Wildcard CORS on `/api/*` to bridge origins | Same origin, no CORS |
| Admin gate in browser JavaScript | Middleware + server layout + action checks |
| Admin auth separate from storefront auth | One session |
| Product catalogue hardcoded in two places | One `products` table |
| Loyalty points awarded from the browser | Idempotent SQL function |
| Chart.js from a CDN | Inline SVG, no dependency |

---

## See also

- [data-model.md](data-model.md) — tables, columns, relationships
- [row-level-security.md](row-level-security.md) — the actual access control
- [api-reference.md](api-reference.md) — route handlers
- [security-model.md](security-model.md) — trust boundaries
- [known-issues.md](known-issues.md) — open risks
