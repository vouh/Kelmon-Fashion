# Architecture

The complete architecture of Kelmon: the front end, the back end, the API, the
integrations, and why each significant decision was made the way it was.

**Current as of:** 2026-09-27, after the EzyBite backend merge.

Companion documents: [data-model.md](data-model.md) (tables and columns),
[security.md](security.md) (RLS, trust boundaries, open risks),
[../design.md](../design.md) (colours, fonts, components).

---

## Contents

**Overview**
- [System shape](#system-shape)
- [Directory layout](#directory-layout)

**Front end**
- [Routes](#routes)
- [Component structure](#component-structure)
- [Providers and global state](#providers-and-global-state)
- [Cart and pricing rules](#cart-and-pricing-rules)
- [Styling and theming](#styling-and-theming)
- [Client and server split](#client-and-server-split)

**Back end**
- [Middleware](#middleware)
- [Data layer](#data-layer)
- [API reference](#api-reference)
- [Server Actions](#server-actions)
- [Auth](#auth)

**Integrations**
- [M-Pesa](#m-pesa)
- [Google OAuth](#google-oauth)

**Operations**
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Deployment](#deployment)

**Decisions**
- [Design decisions](#design-decisions)
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
| Styling | Tailwind CSS v3 + CSS custom properties |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth — Google OAuth + email/password |
| File storage | Supabase Storage (`product-images` bucket) |
| Payments | M-Pesa STK Push (Safaricom Daraja) |

---

## Directory layout

```
app/
  page.tsx            home
  shop/  product/[id]/  salon/  cart/  checkout/
  orders/  profile/  signin/  about/  contact/
  admin/              gated admin routes
  admin/actions.ts    admin mutations (Server Actions)
  api/                route handlers
  auth/callback/      OAuth code exchange
  robots.ts  sitemap.ts
  layout.tsx  globals.css  not-found.tsx
components/
  admin/              AdminShell, per-screen managers, BarChart
  providers/          Auth, Cart, Theme, Toast
  layout/             AppShell, FloatingTopNav, BottomNav, Footer,
                      SearchOverlay, ThemeToggle
  home/               HeroShowcase, HeroSlider, CircleCollection,
                      SaleBanner, SalonServicesSection, FaqSection,
                      NewsletterSignup
  shop/               ProductCard, FeatureProductCard, ProductSlider,
                      ProductCarousel, FilterBoard, ShopClient
  product/            ProductDetailClient
  orders/  profile/  salon/  contact/
  ui/                 Reveal, StarRating, Toast
lib/
  supabase/           client, server, types, products, orders,
                      content, stats, salon
  mpesa.ts            STK Push
  products.ts         Product type, row mapper, formatKes
  cart.ts             cart maths, delivery fee, variant options
  salon.ts            SalonService type and mapper
  avatars.ts  logo.ts
  dev-auth.ts         development-only login fallback
  dev-fixtures.ts     development-only sample data
middleware.ts         session refresh + /admin gate
styles/design.css     design tokens
supabase/
  migrations/0001_init.sql
  seed.sql
```

---

# Front end

## Routes

### Storefront

| Route | Rendering | Purpose |
|---|---|---|
| `/` | Static shell, server-fetched data | Hero, collections, featured products, salon teaser |
| `/shop` | Dynamic | Catalogue with category filter and search |
| `/product/[id]` | Dynamic | Detail page, variant picker, add to cart |
| `/salon` | Server fetch → client | Service listing and waitlist |
| `/cart` | Client | Line editing, totals |
| `/checkout` | Client | Delivery details, payment method, submits order |
| `/orders` | Dynamic | Order history for the signed-in user |
| `/profile` | Client | Account details, loyalty points |
| `/signin` | Client | Google + email/password, sign-up toggle |
| `/about`, `/contact` | Static | Content pages |

### Admin

All under `/admin`, all `force-dynamic` (never cached — they depend on the
caller's session and show live data).

| Route | Purpose |
|---|---|
| `/admin` | Dashboard: totals, paid/failed counts, recent orders |
| `/admin/orders` | Search, filter, expand line items, change status, direct orders |
| `/admin/products` | Full CRUD with image upload, sizes, colours, stock |
| `/admin/stats` | 7-day order and revenue charts, payment outcomes |
| `/admin/deals` | Create and delete promotions |
| `/admin/updates` | Create and delete announcements |
| `/admin/reviews` | Rating histogram, moderation |
| `/admin/transactions` | Paid orders with M-Pesa receipts |
| `/admin/transactions/failed` | Failures with reasons |

---

## Component structure

`AppShell` wraps every storefront page and supplies the chrome:

```
AppShell(activeNav, hideBottomNav?)
├── FloatingTopNav      logo, nav links, search trigger, cart badge, theme toggle
│   └── SearchOverlay   full-screen search, loads its own catalogue
├── {children}
├── Footer
└── BottomNav           mobile only, hidden on checkout
```

`AdminShell(title, subtitle?, actions?, adminEmail?)` is the admin equivalent:
fixed sidebar on desktop, drawer behind a menu button on mobile, sticky topbar,
and a footer with the signed-in email and sign-out.

### Presentation conventions

Product cards take a `Product` and nothing else. That is what allowed the
catalogue to move from hardcoded arrays to Postgres without touching a single
card component — `productFromRow()` in `lib/products.ts` maps a database row to
the same `Product` shape the components already rendered:

```ts
export interface Product {
  id: string; name: string; price: number; category: string;
  image: string;            // images[0]
  rating: number; reviewCount: number;
  badge?: string; originalPrice?: number;
  // present when it came from the database
  description?: string; images?: string[];
  sizes?: string[]; colors?: string[]; stock?: number;
}
```

Keeping `image` as a single string rather than switching to `images[]` was
deliberate for the same reason.

---

## Providers and global state

`AppProviders` nests four providers, in this order:

```
ThemeProvider          light/dark, persisted to localStorage
└── AuthProvider       Supabase session, profile, sign-in/out
    └── CartProvider   cart lines, persisted to localStorage
        └── ToastProvider
```

### AuthProvider

Exposes `{ configured, loading, user, session, profile, isAdmin,
signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, updateProfile,
refreshProfile }`.

It replaces EzyBite's pattern of `window.fb_*` globals plus a
`document.addEventListener('auth-changed')` event. `onAuthStateChange` keeps the
session in React state; the profile row is refetched whenever it changes.

`authErrorMessage()` maps Supabase errors to friendly copy — the same role
`getAuthErrorMessage()` played in `js/auth.js`, rewritten because Supabase
reports messages rather than `auth/*` codes.

When Supabase is unconfigured the provider yields `configured: false` and no
client is constructed, so the app renders instead of throwing.

### CartProvider

Holds `CartLine[]` in state and localStorage. Lines are keyed by
`productId::variant`, so the same product in two sizes is two lines.

---

## Cart and pricing rules

From `lib/cart.ts`:

```ts
export const FREE_DELIVERY_THRESHOLD = 3000;  // KES
export const DELIVERY_FEE = 150;              // KES

export function deliveryFeeFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}
```

Variant options are derived from the category when a product carries no explicit
`sizes`/`colors`:

| Category | Label | Options |
|---|---|---|
| Perfumes | Size | 30ml, 50ml, 100ml |
| Bags | Color | Black, Brown, Cream |
| Fashion | Size | S, M, L |
| Nails | Kit | Nude, Bold, Classic |

**The same functions run server-side at checkout.** `/api/orders` calls
`cartSubtotal()` and `deliveryFeeFor()` itself rather than trusting the browser's
arithmetic, so the rule cannot drift between client and server.

---

## Styling and theming

Tailwind v3 with semantic colour names mapped to CSS custom properties, so a
class like `bg-surface` resolves through `var(--theme-surface)` and flips with the
theme without conditional classes:

```ts
colors: {
  primary: "var(--theme-primary)",
  surface: "var(--theme-surface)",
  "on-surface": "var(--theme-on-surface)",
  // …
}
```

Tokens live in `styles/design.css` under `:root, .dark` and `.light`. Theme
selection is applied by an inline script in `app/layout.tsx` before first paint,
which avoids a flash of the wrong theme.

Full palette, type scale and component specs: [../design.md](../design.md).

The **admin panel is deliberately exempt**. It uses fixed `zinc-950/900` surfaces
with a `purple-400` accent rather than the theme tokens, so it stays dark
regardless of the storefront setting.

---

## Client and server split

Server Components do all data fetching. Client Components receive data as props
and own only interaction state. Three consequences worth knowing:

- **Functions cannot be passed as props** from a Server to a Client Component.
  `BarChart` takes `valueFormat="kes"` rather than a formatter function for
  exactly this reason; passing one is a build-time error.
- **`SearchOverlay` is the deliberate exception to prop-drilling.** It sits inside
  `AppShell` on every page, so threading products through the shell would touch
  every route. It loads its own catalogue from the browser client the first time
  it opens — one fetch per page load, only if used.
- **`/salon` is split** into a server page that fetches and a `SalonClient` that
  renders, because a `"use client"` file cannot itself await data.

---

# Back end

## Middleware

`middleware.ts` runs on nearly every request and does two jobs:

1. **Refreshes the Supabase session.** Calling `getUser()` renews an expired
   access token and writes the new cookie onto the response. Without this,
   sessions expire mid-visit.
2. **Gates `/admin`.** Unauthenticated → `/signin?next=…`. Authenticated
   non-admin → `/?error=not-authorized`. The role is read from `profiles`, not
   from a token claim.

The matcher excludes Next internals and static assets — widening it would add
latency to image requests for no benefit.

---

## Data layer

`lib/supabase/` has one module per domain: `products`, `orders`, `content`
(reviews/deals/updates), `stats`, `salon`. Every read function has the same
shape:

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
- **A read failure degrades rather than 500s.** A broken RLS policy shows an empty
  shop and logs the cause, instead of an error page.

Writes behave the opposite way — they throw, or return `{ ok: false, error }`.
Silently dropping a write is worse than failing loudly.

### Clients

| Factory | Use |
|---|---|
| `createClient()` (client.ts) | Browser, anon key, subject to RLS |
| `createClient()` (server.ts) | Server, caller's session cookies, subject to RLS |
| `createServiceClient()` | **Bypasses RLS.** Two call sites only — see [security.md](security.md#service-role-key) |

---

## API reference

All request and response bodies are JSON.

### `POST /api/orders`

Creates an order for the signed-in user.

**Auth:** required.

```json
{
  "name": "Amina Wanjiru",
  "phone": "0712345678",
  "dropPoint": "UoN Main Campus — Gate C",
  "campus": "University of Nairobi",
  "payment": "mpesa",
  "notes": "Please call on arrival.",
  "lines": [
    { "productId": "lv-speedy-bag", "quantity": 1, "variant": "Black" }
  ]
}
```

`payment` is `"mpesa"` or `"cod"`; anything else is treated as `mpesa`.

**Money is not accepted from the client.** Any `price`, `subtotal`,
`deliveryFee` or `total` in the payload is ignored. Each line is re-priced against
the `products` table and the fee recomputed. Only `productId`, `quantity`
(floored, minimum 1) and `variant` are honoured per line. See
[decision 4](#4-orders-re-priced-server-side).

**200**

```json
{ "orderId": "KM-M2X9K1", "subtotal": 8500, "deliveryFee": 0, "total": 8500 }
```

| Status | Condition |
|---|---|
| 400 | Missing `name`, `phone`, `dropPoint`, or empty `lines` |
| 401 | Not signed in |
| 409 | A product is missing or `active = false` |
| 500 | Insert failed |
| 503 | Supabase not configured |

---

### `POST /api/mpesa/stk-push`

Sends an STK Push prompt for an existing order.

**Auth:** required. The order lookup is scoped by RLS to the caller's own orders,
so it doubles as the authorisation check.

```json
{ "orderId": "KM-M2X9K1", "phone": "0712345678" }
```

**There is no `amount` field** — it comes from `orders.total`.

**200**

```json
{
  "success": true,
  "message": "Success. Request accepted for processing",
  "checkoutRequestId": "ws_CO_27092026143512345",
  "merchantRequestId": "29115-34620561-1"
}
```

On success the order becomes `status='awaiting_mpesa'`,
`payment_status='initiated'`, with the checkout ids stored for the callback.

| Status | Condition |
|---|---|
| 400 | Missing fields, or an unparseable Kenyan number |
| 404 | Order not found, or not visible to the caller |
| 409 | Order already paid |
| 502 | Safaricom rejected it — body carries `details` and often `hint` |
| 503 | M-Pesa not configured — body lists the missing env vars |

---

### `POST /api/mpesa/callback`

Called by Safaricom, not by the app.

**Always returns HTTP 200 with `ResultCode: 0`** — including on internal errors.
Anything else makes Safaricom retry repeatedly.

Request (abridged):

```json
{ "Body": { "stkCallback": {
  "CheckoutRequestID": "ws_CO_27092026143512345",
  "ResultCode": 0,
  "ResultDesc": "The service request is processed successfully.",
  "CallbackMetadata": { "Item": [
    { "Name": "Amount", "Value": 8500 },
    { "Name": "MpesaReceiptNumber", "Value": "SJH4K2L9AA" },
    { "Name": "PhoneNumber", "Value": 254712345678 }
  ]}
}}}
```

| `ResultCode` | Effect |
|---|---|
| `0` | `status='confirmed'`, `payment_status='paid'`, receipt stored, then `award_loyalty_points()` |
| non-zero | `status='pending'`, `payment_status='failed'`, `ResultDesc` stored — order stays retryable |

Lookup is by `mpesa_checkout_request_id` (unique partial index). Uses the
service-role client because no user session exists. `GET` also ACKs, since some
Safaricom configurations probe the URL.

---

### `GET /auth/callback`

OAuth landing route. Exchanges the one-time `code` for a session.

| Query | Meaning |
|---|---|
| `code` | Authorisation code from the provider |
| `next` | Post-sign-in path. **Same-site only** — must start with a single `/`, else falls back to `/profile` |

---

### `POST` / `DELETE /api/dev-auth`

**Development only.** Returns **404** whenever `NODE_ENV === "production"` or
Supabase is configured. `POST { email, name }` sets an `httpOnly` cookie; the role
is derived from the email server-side, never read from the cookie. `DELETE`
clears it. See [decision 5](#5-development-only-auth-fallback).

---

## Server Actions

All admin mutations live in `app/admin/actions.ts`. They replace the write half of
EzyBite's `window.fb_*` layer, and remove the need for nine hand-written
endpoints.

Every action begins:

```ts
async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorized.");
  return createClient();
}
```

This is the third of the authorisation layers, and it matters independently: a
Server Action is a callable POST endpoint, invocable without ever loading an admin
page.

Actions return `{ ok: true } | { ok: false, error: string }` rather than throwing
across the boundary, then `revalidatePath()` the affected routes.

| Group | Actions |
|---|---|
| Orders | `updateOrderStatus`, `updatePaymentStatus`, `deleteOrder`, `createDirectOrder` |
| Products | `upsertProduct`, `deleteProduct`, `setProductActive` |
| Content | `createDeal`, `deleteDeal`, `createUpdate`, `deleteUpdate`, `deleteReview` |
| Salon | `updateBookingStatus` |

Notes:

- `createDirectOrder` is the road-sale path: `source='admin_direct'`,
  `user_id=null`, opened unpaid so it can then be charged by STK Push.
- `updatePaymentStatus` lets an admin mark an order paid by hand — needed for cash
  on delivery and lost callbacks. It does **not** award loyalty points; only a
  genuine callback does.
- Prefer `setProductActive(id, false)` over `deleteProduct`, which sets
  `order_items.product_id` to null on historical orders.

Calling one:

```tsx
const [pending, startTransition] = useTransition();
const router = useRouter();

startTransition(async () => {
  const result = await updateOrderStatus(order.id, "packed");
  if (!result.ok) setError(result.error);
  else router.refresh();
});
```

---

## Auth

Supabase Auth with Google OAuth and email/password. `auth.users` is the single
user directory; the `handle_new_user` trigger creates the matching `profiles` row
on signup, pulling name and avatar from OAuth metadata.

Admin access is `profiles.role = 'admin'`, a database value — not a hardcoded
list. `profiles.role` is not client-writable; see
[security.md](security.md#privilege-escalation-is-blocked-in-the-schema).

---

# Integrations

## M-Pesa

This code is a merge of Kelmon's TypeScript structure and the production
hardening from EzyBite's `api/stkpush.js`, which ran live against Safaricom.

### Flow

```
Customer            Kelmon                          Safaricom
   │ checkout ────► │ POST /api/orders (re-price, insert)
   │ ◄── orderId ── │
   │ ─────────────► │ POST /api/mpesa/stk-push
   │                │  amount from orders.total
   │                │ ── OAuth token ──────────────►
   │                │ ── STK push ─────────────────►
   │                │ ◄── CheckoutRequestID ────────
   │ ◄ "check phone"│  store id, status=awaiting
   │ ◄═════════ PIN prompt on handset ═════════════
   │ ── enters PIN ═══════════════════════════════►
   │                │ ◄── POST /api/mpesa/callback ─
   │                │  paid + award points
   │                │ ── 200 ResultCode:0 ─────────►
```

### Paybill vs till

Set `MPESA_TILL_NUMBER` only when collecting on a till (Buy Goods).

| | Paybill | Till (Buy Goods) |
|---|---|---|
| `TransactionType` | `CustomerPayBillOnline` | `CustomerBuyGoodsOnline` |
| `BusinessShortCode` | `MPESA_SHORTCODE` | `MPESA_SHORTCODE` (HO/store code) |
| `PartyB` | `MPESA_SHORTCODE` | `MPESA_TILL_NUMBER` |

The password is always derived from `MPESA_SHORTCODE`, never the till. On a till,
`BusinessShortCode` and `PartyB` are **different values** — getting this wrong
yields an opaque Safaricom error.

### Timestamps are UTC, deliberately

The password is `base64(shortcode + passkey + timestamp)`, so both must come from
the same instant. Local-time getters made the value depend on the host's
timezone: a machine in EAT and a Vercel box in UTC produced different passwords
for the same moment. UTC is deterministic everywhere.

### Phone normalisation

`normalizeKenyanPhone()` accepts `07…`, `01…`, `+254…`, `254…`, and bare 9-digit
`7…`/`1…`, returning `2547XXXXXXXX` or `2541XXXXXXXX`. Both Safaricom (`2547`)
and Airtel (`2541`) are accepted; Kelmon's original code allowed only `7`.

### Amounts

Whole shillings only, never zero: `Math.max(1, Math.round(amount))`.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| 502, Safaricom HTTP 404 | Wrong consumer key/secret, or key from the other environment |
| Wrong shortcode / merchant errors | On a till, `PartyB` must be the till and the type `CustomerBuyGoodsOnline` |
| Prompt arrives, order never updates | Callback unreachable — check `MPESA_CALLBACK_URL` is public HTTPS |
| Callback arrives, order not found | `mpesa_checkout_request_id` was not stored |
| Paid but no points | `award_loyalty_points` needs `user_id`; admin-direct orders have none by design |
| Repeated callbacks | The handler returned non-200; it must always ACK |

Both routes log with `[stk-push]` / `[mpesa-callback]` prefixes.

---

## Google OAuth

Handled by Supabase Auth. **No environment variables in this app** — the client
ID and secret live in the Supabase dashboard.

1. **Google Cloud Console → Credentials** → OAuth 2.0 Web client. Authorised
   redirect URI is *Supabase's* callback, not your app's:
   `https://<project-ref>.supabase.co/auth/v1/callback`
   This is the step most often got wrong — the browser goes Google → Supabase →
   your app, so Google must be told Supabase's URL.
2. **Supabase → Authentication → Providers → Google** → paste ID and secret.
3. **Supabase → Authentication → URL Configuration → Redirect URLs** → add your
   app's `/auth/callback` for each environment. Supabase refuses to redirect to an
   unlisted URL; a missing entry shows as a successful Google sign-in that lands
   back on `/signin` with an error.

`prompt: "select_account"` is set so returning users can switch accounts.

Google avatar URLs (`*.googleusercontent.com`) are allow-listed in
`next.config.ts`; a new image host must be added there or `next/image` refuses it.

---

# Operations

## Environment variables

Template: `.env.example`. Copy to `.env.local`.

### Supabase

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public by design — RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | for M-Pesa | **Bypasses RLS. Never `NEXT_PUBLIC_`** |

### M-Pesa

| Variable | Required | Notes |
|---|---|---|
| `MPESA_ENV` | no | `sandbox` (default) or `production` |
| `MPESA_CONSUMER_KEY` / `_SECRET` | yes | Daraja app |
| `MPESA_SHORTCODE` | yes | HO/store code. Sandbox: `174379` |
| `MPESA_PASSKEY` | yes | |
| `MPESA_TILL_NUMBER` | no | Only for till/Buy Goods |
| `MPESA_CALLBACK_URL` | yes | Public HTTPS |
| `MPESA_ACCOUNT_REFERENCE` | no | Default `Kelmon`, max 12 chars |

### Site

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | production | Used by `robots.ts` and `sitemap.ts` |

### Degraded modes

| Missing | Behaviour |
|---|---|
| All Supabase vars | Pages render empty; `/admin` uses the dev fallback locally |
| `SUPABASE_SERVICE_ROLE_KEY` | Storefront fine; M-Pesa callback throws when it fires |
| All M-Pesa vars | STK Push returns 503; cash on delivery still works |

Restart the dev server after editing — `NEXT_PUBLIC_*` values are inlined at build
time and do not hot-reload.

---

## Running locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Runs with **no configuration**: sample data, and a test admin login.

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

Run `typecheck` before committing — the Supabase types are hand-written, so it is
what catches schema drift.

### Test admin login

At `/signin`: `admin@gmail.com`, any 6+ character password. Then open `/admin`.
Any other email signs in as a customer and is refused.

Sample data comes from `lib/dev-fixtures.ts`: 8 orders across every state spread
over 5 days, 6 products, 6 reviews, 3 deals, 3 updates, 4 salon services.
**Writes do not persist in this mode.**

### Against real Supabase

```bash
npx supabase link --project-ref <ref>
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

Sign in once, then grant admin (see
[security.md](security.md#privilege-escalation-is-blocked-in-the-schema)).

### M-Pesa locally

```bash
npx ngrok http 3000
# MPESA_CALLBACK_URL=https://<id>.ngrok-free.app/api/mpesa/callback
```

### Gotchas

- **Port in use** — Next.js silently picks the next free port. Read the output.
- **`next dev` and `next build` conflict** — they share `.next` and produce
  confusing `Cannot find module for page` errors. Stop dev before building.
- **Every query types as `never`** — a row declared as `interface` instead of
  `type`, or an `@supabase/ssr` version mismatch. See
  [data-model.md](data-model.md#the-typescript-mirror).
- **New image host** — must be allow-listed in `next.config.ts`.

---

## Deployment

Target is Vercel, but any Node host running `next build && next start` works, so
long as middleware is supported — the `/admin` gate lives there.

### Checklist

- [ ] Migration applied; seed run; RLS verified
- [ ] First admin granted
- [ ] All environment variables set, service-role key **not** `NEXT_PUBLIC_`
- [ ] `NEXT_PUBLIC_SITE_URL` is the real origin
- [ ] `MPESA_ENV=production` with production credentials
- [ ] `MPESA_CALLBACK_URL` → `https://<domain>/api/mpesa/callback`
- [ ] Google provider configured; redirect URLs include production
- [ ] `npm run typecheck && npm run build && npm run lint`
- [ ] Confirm the dev login is inert:
      `curl -X POST https://<domain>/api/dev-auth` → **404**

### Smoke test

1. `/` renders real products.
2. `/shop` filters by category.
3. `/product/<slug>` renders; a bad slug 404s.
4. Google sign-in works; `/profile` shows your name.
5. `/admin` refuses a non-admin, admits an admin.
6. **Place and pay a small real order.** Confirm the prompt arrives, the order
   flips to `paid` with a receipt, points are awarded, and it appears under
   Successful Payments.
7. `/robots.txt` and `/sitemap.xml` show the real domain.

Step 6 is the one that matters most and cannot be verified in sandbox — the
callback has to reach your deployed origin.

### Notes

- Admin routes are `force-dynamic`; never cache them.
- Admin writes `revalidatePath()` the affected storefront routes, so edits appear
  without a redeploy.
- **Rollback** is a redeploy of the previous build — provided no migration ran.
  Migrations are append-only; write a compensating migration rather than reverting
  the file.

---

# Design decisions

Each records the context, the options, what was chosen, and what it costs. To
change one, add a new entry rather than rewriting history.

---

## 1. Supabase Auth over Firebase Auth

**Accepted · 2026-09-27**

### Context

EzyBite used Firebase Auth with Firestore. Kelmon was moving to Supabase
Postgres. The requirement was free Google sign-in — which both provide, so cost
did not decide it.

### Options

**A. Firebase Auth + Supabase Postgres.** RLS authorises by reading claims from
the JWT Supabase Auth issued; `auth.uid()` resolves from that token. A Firebase ID
token is not that token. Making RLS work would require verifying the Firebase
token, minting a second JWT signed with the Supabase secret, attaching it to every
request, and keeping two user directories in step. Every policy then depends on
that bridge — a bug in it is an authorisation bug across every table at once.

**B. Supabase Auth + Supabase Postgres.** One vendor issues the token and enforces
the policies. Cost: existing Firebase users do not carry over, as passwords are
hashed and cannot be migrated.

### Decision

**Option B.** Authorisation rules belong in the schema. "A customer reads only
their own orders" becomes a policy that holds regardless of which code path runs —
a Server Component, a Server Action, or a raw query from the browser console. The
migration cost is near zero in practice: Kelmon is a different product, and the
EzyBite accounts were food-delivery customers.

### Consequences

**Good** — `auth.uid()` works natively; one user directory; authorisation
reviewable in one SQL file; `profiles.role` replaces a hardcoded client-side email
list.

**Accepted** — existing accounts do not transfer; auth and data share a vendor
(splitting them would not help availability much, since the database is needed
anyway); Google OAuth needs dashboard configuration not captured in code.

**Bootstrapping consequence** — `profiles.role` is not client-writable, so the
first admin must be granted with the service role.

---

## 2. Single-store catalogue, not multi-vendor

**Accepted · 2026-09-27**

### Context

"Campus fashion platform" can mean a shop Kelmon stocks, or a marketplace where
students list their own items. The difference determines the schema, and
retrofitting per-vendor ownership after launch touches the schema, every policy,
the admin panel and checkout.

### Options

**A. Single store.** Kelmon owns all inventory; RLS stays simple.

**B. Multi-vendor.** Adds `vendors`, `seller_id`, `vendor_id` on order items,
payouts, per-vendor RLS, order splitting across sellers, and a vendor dashboard.
Payments get harder: one STK Push collects into one till, so revenue must be
apportioned afterwards.

### Decision

**Option A.** It matches how the ported admin already worked — one operator
managing all orders — and it is the smaller correct thing to build first.

### Consequences

**Good** — legible RLS; simple checkout and payments; the ported admin fits
unmodified.

**Accepted** — no student sellers without a real migration.

**Migration path**, designed for deliberately: add `vendors` and nullable
`vendor_id` columns, backfill every row to a single "Kelmon" vendor, make them
`NOT NULL`, add per-vendor policies alongside the admin ones. `order_items`
already denormalises name, price, image and category, so an order stays a faithful
receipt after a product changes hands — exactly what per-vendor accounting needs.

---

## 3. Admin panel rewritten in Next.js

**Accepted · 2026-09-27**

### Context

EzyBite's admin was nine static HTML files sharing `admin-shell.js`,
`admin-auth.js` and `js/firebase-service.js`. It worked and was in production. The
database was moving, so the data layer had to be rewritten either way — the
question was only whether the *pages* stayed static HTML.

### Options

**A. Keep static HTML, swap the data layer.** Cheapest, preserves the UI exactly.
But files in `public/` are static assets, so no server-side gate is possible; the
admin session stays separate; and there are no shared types, so the order shape can
drift from the schema silently.

**B. Port to `app/admin/*` React routes.** More work; the markup is rebuilt.

### Decision

**Option B.** The deciding factor is the gate. The original:

```js
const ADMIN_EMAILS = ['peterkelvinkibiru1532@gmail.com', 'sabastianthuo3@gmail.com'];
// inject a full-screen overlay, wait for Firebase, compare email, then reveal
setTimeout(() => { if (gateStillPresent) deny(); }, 10000);
```

Three structural problems, not fixable in place:

1. **The admin HTML is delivered to anyone who requests it.** The overlay hides
   it; it does not withhold it. View-source reveals the whole panel.
2. **The admin list is a client-side constant**, so adding an admin is a deploy,
   and the list of who has access is public.
3. **Nothing server-side is checking.** Any bug removing the overlay early would
   expose the page.

Under A these stay true no matter how good the new data layer is.

### Consequences

**Good** — admin HTML never reaches a non-admin browser; granting admin is a row
update, not a deploy; one session; shared types mean a breaking schema change
fails at `tsc`; mutations are Server Actions with no endpoints to secure.

**Accepted** — the markup is a re-creation, not the original (layout and the dark
aesthetic preserved; colours rebranded from EzyBite orange to Kelmon purple
deliberately); `window.confirm()` became a two-step inline confirm; Chart.js from
a CDN became an inline-SVG `BarChart`, dropping a dependency but also its
features.

`admin/login.html` was not ported — admins sign in at `/signin` and are routed by
role, so there is no second credential surface.

---

## 4. Orders re-priced server-side

**Accepted · 2026-09-27**

### Context

Two money-handling flaws were found in the pre-merge code.

`/api/orders` stored client-supplied totals:

```ts
const order = {
  subtotal: body.subtotal,        // from the browser
  deliveryFee: body.deliveryFee,  // from the browser
  total: body.total,              // from the browser
  lines: body.lines,              // including each line's price
};
```

Nothing compared these against the catalogue — a crafted POST could create a
genuine order for an 8,500 KES bag with `total: 1`.

And `/api/mpesa/stk-push` charged a client-supplied `amount`, so the customer
could approve a far smaller payment while the callback still marked the order
fully paid. Together, the amount owed and the amount charged were both under
client control, independently.

### Options

**A.** Validate on the client — worthless; that is UX, not a control.
**B.** Recompute and reject on mismatch — produces false failures whenever a price
legitimately changes mid-session.
**C.** Recompute and ignore the client's figures entirely.

### Decision

**Option C**, plus reading the M-Pesa amount from the stored order. The client says
*what* is being bought; the server decides *what it costs*.

### Consequences

**Good** — order value and charged amount both derive from server state; a
mid-session price change charges the current price rather than failing; delisted
products cannot be ordered; the RLS-scoped select in the STK route means a user
cannot pay against someone else's order.

**Accepted** — one extra indexed query per checkout; and a customer **can be
charged a different price than displayed** if the catalogue changed mid-session
(logged as a known issue).

**Defence in depth** — the RLS insert policy independently pins the opening state,
so even a compromised handler using the anon key cannot insert an order claiming
to be paid.

---

## 5. Development-only auth fallback

**Accepted · 2026-09-27**

### Context

The admin panel could not be reviewed without first creating a Supabase project,
applying migrations, configuring OAuth, signing in, and promoting a profile with
the service role.

An initial attempt used `localStorage`, which cannot work: the `/admin` gate runs
in middleware and a server layout, where `localStorage` is unreadable. The
storefront appeared signed in while `/admin` kept redirecting.

### Options

**A. No fallback** — safest, but nobody sees the admin panel without
infrastructure.
**B. A `NEXT_PUBLIC_DEV_ADMIN=true` flag** — rejected; `NEXT_PUBLIC_*` is inlined
into the client bundle and settable in production as easily as locally. One
misconfigured variable would disable the admin gate in production.
**C. A cookie session gated on conditions that cannot both hold in production.**

### Decision

**Option C:**

```ts
export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !supabaseConfigured();
}
```

A deployed build fails condition 1; a configured local server fails condition 2.
Adding real keys switches it off with no code change. Two further constraints: the
role is re-derived from the email server-side so a forged cookie grants nothing,
and the endpoint 404s when disabled rather than 403, so it does not advertise
itself.

### Verification

Checked against a real `next build && next start` — the endpoint returns 404, an
admin cookie is ignored, a forged cookie is refused, and a non-admin email is
refused. Table in [security.md](security.md#development-auth-fallback).

### Consequences

**Good** — reviewable on a fresh clone; switches off automatically; no production
path depends on it.

**Accepted** — auth-adjacent code exists only to be disabled in production
(confined to two `dev-*` files behind one function); writes do not persist in this
mode; `DEV_ADMIN_EMAILS` is a hardcoded list, the same pattern criticised in
decision 3, acceptable only because it cannot execute in production.

**To remove:** delete `lib/dev-auth.ts`, `lib/dev-fixtures.ts`,
`app/api/dev-auth/route.ts`, and the `isDevAuthEnabled()` branches in
`middleware.ts`, `lib/supabase/server.ts`, `app/admin/layout.tsx` and each
`lib/supabase/*` read module.

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
| `window.fb_*` globals | Typed modules in `lib/supabase/` |
