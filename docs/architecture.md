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
- [Firebase Auth](#firebase-auth)

**Operations**
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Deployment](#deployment)

**Decisions**
- [Design decisions](#design-decisions)
- [What this replaced](#what-this-replaced)

---

## System shape

Kelmon is a single Next.js 15 application (App Router). Supabase holds the data
and enforces access; Firebase Auth issues the identity tokens that access is
enforced against. There is no separate backend service and no separate admin
app — a deliberate change from the pre-merge state, where the storefront and admin
panel were different codebases on different hosts.

```
┌──────────────────────────── Next.js app ─────────────────────────────┐
│                                                                      │
│  Storefront (public)          Admin (/admin, gated)                  │
│  /  /shop  /product/[id]      /admin            /admin/products      │
│  /cart  /checkout             /admin/orders     /admin/stats         │
│  /orders  /profile  /signin   /admin/deals      /admin/updates       │
│  /about  /contact             /admin/reviews    /admin/transactions  │
│                                                                      │
│  ── middleware.ts ── /admin gate on every request (unverified peek)   │
│                                                                      │
│  Route handlers                Server Actions                        │
│  /api/auth/session             app/admin/actions.ts                  │
│  /api/orders                   (all admin writes)                    │
│  /api/mpesa/stk-push                                                 │
│  /api/mpesa/callback                                                 │
└──────┬─────────────────┬───────────────────────┬─────────────────────┘
       │                 │                       │
       ▼                 ▼                       ▼
┌──────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│Firebase Auth │  │    Supabase      │  │  Safaricom Daraja   │
│Google +      │  │  Postgres + RLS  │  │     (M-Pesa)        │
│email/password│──│  Storage         │◄─┤   STK Push          │
│custom claims │ID│  (3 buckets)     │  └─────────────────────┘
└──────────────┘tk└──────────────────┘
```

The ID token is the only thing joining the left two boxes: Supabase is registered
with Firebase as a third-party auth provider, so it validates that token itself
and every RLS policy reads the Firebase UID out of it.

### Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript |
| Styling | Tailwind CSS v3 + CSS custom properties |
| Database | Supabase Postgres with Row Level Security |
| Auth | Firebase Auth — Google popup + email/password — as a Supabase third-party provider |
| File storage | Supabase Storage (`product-images`, `deal-images`, `avatars`) |
| Payments | M-Pesa STK Push (Safaricom Daraja) |

---

## Directory layout

```
app/
  page.tsx            home
  shop/  product/[id]/  cart/  checkout/
  orders/  profile/  signin/  about/  contact/
  admin/              gated admin routes
  admin/actions.ts    admin mutations (Server Actions)
  api/                route handlers
  api/auth/session/   ID token -> claims, profile, cookie
  robots.ts  sitemap.ts
  layout.tsx  globals.css  not-found.tsx
components/
  admin/              AdminShell, per-screen managers, BarChart
  providers/          Auth, Cart, Theme, Toast
  layout/             AppShell, FloatingTopNav, BottomNav, Footer,
                      SearchOverlay, ThemeToggle
  home/               HeroShowcase, HeroSlider, CircleCollection,
                      SaleBanner, FaqSection, NewsletterSignup
  shop/               ProductCard, FeatureProductCard, ProductSlider,
                      ProductCarousel, FilterBoard, ShopClient
  product/            ProductDetailClient
  orders/  profile/  contact/
  ui/                 Reveal, StarRating, Toast
lib/
  firebase/
    client.ts         browser SDK singleton (auth, firestore, storage)
    admin.ts          Admin SDK: verify tokens, write custom claims
    session.ts        verified server identity (Node only)
    cookie.ts         cookie name + unverified peek (Edge safe)
  supabase/           client, server, types, products, orders,
                      content, stats, storage
  mpesa.ts            STK Push
  products.ts         Product type, row mapper, formatKes
  cart.ts             cart maths, delivery fee, variant options
  avatars.ts  logo.ts
  validation/
    schemas.ts        Zod schemas for every untrusted boundary
middleware.ts         /admin gate
styles/design.css     design tokens
prisma/
  schema.prisma       tables, columns, relations
  migrations/         generated DDL + hand-written RLS, functions, buckets
  seed.sql            first-admin grant. No catalogue
prisma.config.ts      connection URLs, dotenv loading
```

Prisma owns the schema and nothing else — there is no Prisma Client here. It
connects straight to Postgres, so RLS does not apply to it; putting reads on it
would move authorisation out of the database and into app code. See
[decision 7](#7-prisma-for-schema-only-supabase-js-for-data).

`lib/firebase/session.ts` and `lib/firebase/cookie.ts` are split for a reason:
middleware runs on the Edge runtime, where the Admin SDK's Node crypto cannot
load, so anything middleware imports has to stay free of it.

---

# Front end

## Routes

### Storefront

| Route | Rendering | Purpose |
|---|---|---|
| `/` | Static shell, server-fetched data | Hero, collections, featured products |
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
└── AuthProvider       Firebase session, profile, sign-in/out
    └── CartProvider   cart lines, persisted to localStorage
        └── ToastProvider
```

### AuthProvider

Exposes `{ configured, loading, user, profile, isAdmin, signInWithGoogle,
signInWithEmail, signUpWithEmail, signOut, updateProfile, refreshProfile }`.
`user` is a Firebase `User`; `profile` is the `profiles` row read through
Supabase.

It listens with **`onIdTokenChanged`**, not `onAuthStateChanged`. The difference
matters: `onIdTokenChanged` also fires for the automatic refresh Firebase performs
shortly before the hour is up, which is what keeps the server's cookie from going
stale while a tab sits open. On every firing it:

1. POSTs the token to `/api/auth/session`, which verifies it, writes the custom
   claims, ensures a `profiles` row, and sets the httpOnly cookie;
2. reloads the profile row;
3. calls `router.refresh()` **only when the uid changed**, so server components
   rendered before the cookie existed get re-rendered, while a routine hourly
   refresh does not remount the page.

If the session route reports `refreshRequired` — meaning it just wrote a claim
that the token predates — the provider forces `getIdToken(true)` and posts again.
That settles in exactly one extra round, because the second call finds nothing
left to write.

`authErrorMessage()` maps Firebase `auth/*` codes to friendly copy — the same role
`getAuthErrorMessage()` played in `js/auth.js`.

When Firebase is unconfigured the provider yields `configured: false` and never
touches the SDK, so the app renders instead of throwing.

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

1. **Gates `/admin`.** No usable token → `/signin?next=…`. Signed in without the
   `admin` claim → `/?error=not-authorized`.
2. **Redirects away from `/signin`** for anyone already signed in.

It does **not** refresh anything: Firebase refreshes its own token in the
browser, and `AuthProvider` re-posts the cookie when it does.

It also does **not verify** the token. Middleware runs on the Edge runtime, where
the Admin SDK cannot load, so `peekIdToken()` decodes the JWT payload and checks
`exp` without checking the signature. That is sound only because it decides
nothing but a redirect — `app/admin/layout.tsx` verifies properly, and RLS is the
real boundary. See
[security.md](security.md#authorisation-layers).

An expired cookie is treated as signed out, which bounces `/admin` through
`/signin`; the page mints a fresh token and sends the user on to `next`.

The matcher excludes Next internals and static assets — widening it would add
latency to image requests for no benefit.

---

## Data layer

`lib/supabase/` has one module per domain: `products`, `orders`, `content`
(reviews/deals/updates), `stats`, `storage`. Every read function has the same
shape:

```ts
export async function getThing(): Promise<Thing[]> {
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

There is no sample-data branch. An earlier version returned fixtures from
`lib/dev-fixtures.ts` when Supabase was unconfigured, which meant a misconfigured
environment looked like a working one — the shop was full either way. Both the
fixtures and the dev-auth cookie they came with have been removed, so an empty
storefront now unambiguously means an empty table.

Writes behave the opposite way — they throw, or return `{ ok: false, error }`.
Silently dropping a write is worse than failing loudly.

### Clients

| Factory | Use |
|---|---|
| `createClient()` (client.ts) | Browser, anon key + `accessToken` from `getIdToken()`, subject to RLS |
| `createClient()` (server.ts) | Server, anon key + the token from the cookie, subject to RLS |
| `createServiceClient()` | **Bypasses RLS.** Three call sites only — see [security.md](security.md#service-role-key) |

Both session clients come from `@supabase/supabase-js` directly rather than
`@supabase/ssr`. With Firebase owning the session there is no Supabase session to
refresh and no auth cookies to shuttle between request and response, so the only
credential is the bearer token and the `accessToken` callback is the whole
integration. `@supabase/ssr` was removed from the dependencies.

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

### `POST` / `DELETE /api/auth/session`

Bridges the Firebase session in the browser to the server. Called by
`AuthProvider` on sign-in and on every token refresh — not by page code.

**POST** body: `{ "idToken": "<firebase id token>" }`

It verifies the token with the Admin SDK, decides whether the user is an admin,
writes the `role` and `admin` custom claims, ensures a `profiles` row exists, and
sets the httpOnly `kelmon-token` cookie.

```json
{ "uid": "8f2…", "admin": false, "refreshRequired": false }
```

`refreshRequired: true` means a claim was just written that the submitted token
predates. The client must call `getIdToken(true)` and POST again, otherwise
Postgres never sees the new claim.

| Status | When |
|---|---|
| 200 | Token verified, cookie set |
| 401 | Token invalid or expired |
| 503 | Firebase Admin credentials missing on the server |

A failed `profiles` write does **not** fail the request: the user is authenticated
either way, and the next request retries.

**DELETE** clears the cookie. No body, always 200.

There is no OAuth landing route. Google sign-in uses `signInWithPopup`, so the
caller stays on the page and there is no `code` to exchange — `/auth/callback` was
removed with the switch to Firebase.

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

Firebase Auth with Google (popup) and email/password, registered with Supabase as
a third-party auth provider. Firebase is the user directory; `profiles` mirrors it,
keyed by the Firebase UID, and the row is created by `/api/auth/session` on first
sign-in.

The full model — claims, the token cookie, and why middleware only peeks at the
token — is in [security.md](security.md#authentication).

Admin access is the `admin` custom claim, backed by `profiles.role = 'admin'`.
Neither is client-writable, and the first admin comes from the `ADMIN_EMAILS`
allowlist; see
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

## Firebase Auth

Four console steps, and the third is the one that is easy to miss.

1. **Firebase console → Authentication → Sign-in method** → enable **Email/Password**
   and **Google**. Google needs no client ID here; Firebase provisions one.
2. **Firebase console → Authentication → Settings → Authorised domains** → add
   `localhost` and your production domain. A missing entry surfaces as
   `auth/unauthorized-domain` when the popup opens.
3. **Supabase dashboard → Authentication → Third Party Auth** → add a Firebase
   provider and give it your Firebase **project ID**. Without this, Supabase
   rejects every token and each query fails on authorisation rather than on RLS —
   the symptom is a signed-in user seeing nothing at all.
4. **Firebase console → Project settings → Service accounts** → *Generate new
   private key*. Those three fields become `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. The server cannot verify a
   token or write a claim without them, so `/admin` stays closed until they exist.

`prompt: "select_account"` is set on the Google provider so returning users can
switch accounts.

Google avatar URLs (`*.googleusercontent.com`) are allow-listed in
`next.config.ts`; a new image host must be added there or `next/image` refuses it.
Uploaded images come from your Supabase Storage domain, which must be allow-listed
the same way.

---

# Operations

## Environment variables

Template: `.env.example`. Copy to `.env.local`.

### Supabase

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public by design — RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Needed by sign-in and M-Pesa. **Bypasses RLS. Never `NEXT_PUBLIC_`** |
| `DIRECT_URL` | migrations | Port 5432. What `prisma migrate` uses |
| `DATABASE_URL` | no | Port 6543, pooled. Fallback only — nothing connects directly at runtime |

Both connection strings come from **Project Settings → Database → Connection
string**, and both contain the database password, so neither may carry a
`NEXT_PUBLIC_` prefix. Migrations need the direct 5432 endpoint: they take
advisory locks and run DDL in a transaction, which pgbouncer's transaction pooling
on 6543 cannot support.

### Firebase

The `NEXT_PUBLIC_` block is the web app config from **Project settings → General →
Your apps**. All of it is public by design: it identifies the project and
authorises nothing.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | yes | |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | yes | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | yes | Also what Supabase's Third Party Auth entry wants |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | yes | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | yes | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | yes | |

The service account is the opposite — it is a private key and must never carry a
`NEXT_PUBLIC_` prefix. Either shape works:

| Variable | Required | Notes |
|---|---|---|
| `FIREBASE_PROJECT_ID` | yes | Falls back to the public project id |
| `FIREBASE_CLIENT_EMAIL` | yes | `firebase-adminsdk-…@<project>.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | yes | Keep the `\n` escapes; quote the whole value |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | alternative | The whole downloaded JSON, raw or base64. Replaces the three above |
| `ADMIN_EMAILS` | first admin | Comma-separated. Granted admin on next sign-in |

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
| All Supabase vars | Pages render empty; sign-in still works but nothing persists |
| `SUPABASE_SERVICE_ROLE_KEY` | Sign-in works but creates no `profiles` row; M-Pesa callback throws when it fires |
| `NEXT_PUBLIC_FIREBASE_*` | Sign-in disabled with a notice on `/signin`; the storefront still browses |
| Firebase service account | `/api/auth/session` returns 503 and `/admin` stays closed — the gate cannot verify anything, so it fails closed |
| Supabase Third Party Auth not configured | Sign-in succeeds, then every query fails authorisation — a signed-in user sees nothing |
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

This gets the storefront rendering, but empty and with sign-in disabled. Real
credentials are needed for anything past browsing — see [First-run
setup](#first-run-setup) below.

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

Run `typecheck` before committing — the Supabase types are hand-written, so it is
what catches schema drift.

### First-run setup

There is no offline mode and no sample data: an empty catalogue is an empty
`products` table. Six steps, in order.

1. **Firebase** — create a project, enable Email/Password and Google, and add
   `localhost` to the authorised domains. Copy the web app config into the
   `NEXT_PUBLIC_FIREBASE_*` variables. See [Firebase Auth](#firebase-auth).
2. **Firebase service account** — generate a private key and set
   `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`. Without these the server
   cannot verify a token, so `/admin` stays shut.
3. **Supabase** — create a project, copy the URL, anon key and service-role key.
4. **Supabase → Authentication → Third Party Auth** — add your Firebase project
   id. Skipping this is the single most confusing failure mode: sign-in works and
   then nothing loads.
5. **Schema** — add the two connection strings from Supabase → Project Settings →
   Database, then apply the migration:
   ```bash
   # DIRECT_URL   = ...pooler host:5432/postgres   (migrations)
   # DATABASE_URL = ...pooler host:6543/postgres   (pooled)
   npm run db:migrate
   ```
6. **First admin** — put your email in `ADMIN_EMAILS`, restart, and sign in. The
   claim and `profiles.role` are both written on that sign-in. Then open
   `/admin/products` and add your first product.

`prisma/seed.sql` only grants admin by email; it contains no catalogue.

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
  `type`. See [data-model.md](data-model.md#the-typescript-mirror).
- **New image host** — must be allow-listed in `next.config.ts`.
- **Signed in but everything is empty** — Supabase is not accepting the Firebase
  token. Check Third Party Auth is configured with the right project id, and that
  the `role: authenticated` claim is on the token (decode it at jwt.io).
- **`/admin` bounces to `/signin` in a loop** — the token cookie is expiring
  before it is read. Check the server clock, and that `/api/auth/session` is
  returning 200 rather than 503 for missing Admin credentials.
- **`FIREBASE_PRIVATE_KEY` errors on start** — the `\n` escapes were stripped, or
  the surrounding quotes were not. Keep it on one line, quoted, escapes intact.

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
- [ ] Firebase sign-in methods enabled; production domain in Firebase's
      **Authorised domains**
- [ ] Supabase **Third Party Auth** entry present, with the right Firebase project id
- [ ] Firebase service-account key set, **not** `NEXT_PUBLIC_`
- [ ] `ADMIN_EMAILS` set, or the first admin already granted in the database
- [ ] Supabase Storage domain allow-listed in `next.config.ts`
- [ ] `npm run typecheck && npm run build && npm run lint`

### Smoke test

1. `/` renders real products.
2. `/shop` filters by category.
3. `/product/<slug>` renders; a bad slug 404s.
4. Google sign-in works; `/profile` shows your name, points and orders — proving
   Supabase accepted the Firebase token, not just that sign-in succeeded.
5. `/admin` refuses a non-admin, admits an admin.
6. Upload a product image in `/admin/products` and confirm it renders on `/shop`.
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

**Superseded by [decision 6](#6-firebase-auth-as-a-supabase-third-party-provider) · 2026-09-28**
(originally accepted 2026-09-27)

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

**Why this was reversed** — the objection to option A was the bridge: verify the
Firebase token, mint a second Supabase-signed JWT, keep two directories in step.
Supabase's third-party auth support removes that bridge entirely, so the reasoning
no longer applies. See [decision 6](#6-firebase-auth-as-a-supabase-third-party-provider).

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

**Reversed · 2026-09-28.** `lib/dev-auth.ts`, `lib/dev-fixtures.ts` and
`app/api/dev-auth/route.ts` are deleted, along with every `isDevAuthEnabled()`
branch. The accepted cost turned out to be worse than described: because the
fixtures were returned whenever Supabase was *unconfigured*, a misconfigured
environment was indistinguishable from a working one — the shop was full either
way, so the failure the fallback was meant to smooth over was the failure it hid.
The app now renders empty and says so.

---

## 6. Firebase Auth as a Supabase third-party provider

**Accepted · 2026-09-28** — supersedes [decision 1](#1-supabase-auth-over-firebase-auth)

### Context

Decision 1 chose Supabase Auth on the grounds that authorisation belongs in the
schema, and that bolting Firebase onto Supabase RLS meant maintaining a
token-bridge nobody wanted to own. Kelmon subsequently needs Firebase Auth. The
question is whether the objection still stands.

### Options

**A. Keep Supabase Auth.** Nothing to build. Does not meet the requirement.

**B. Firebase Auth with a hand-written bridge.** The option decision 1 rejected:
verify the Firebase token server-side, mint a second JWT signed with the Supabase
secret, attach it to every request, reconcile two directories. Every policy then
depends on that bridge, and a bug in it is an authorisation bug across every table
at once. The objection was correct and still is.

**C. Firebase Auth as a Supabase third-party auth provider.** Supabase validates
Firebase ID tokens itself, against Google's published keys, before PostgREST sees
the request. There is no second token, no bridge, and one directory — Firebase —
with `profiles` mirroring it.

### Decision

**Option C.** It satisfies the requirement without reintroducing what decision 1
was actually objecting to. Authorisation still lives in the schema; only the
issuer of the token changed. The work is a migration plus an `accessToken`
callback on two Supabase clients.

### Consequences

**Good** — no custom token bridge; policies stay in SQL and still hold against a
raw query from the browser console; `@supabase/ssr` dropped, since there is no
Supabase session to refresh; the `admin` custom claim makes `is_admin()` free in
the common case.

**Accepted** —

- **`auth.uid()` is unusable.** It casts `sub` to uuid, and a Firebase UID is a
  28-character string. `app_uid()` replaces it, and identity columns became
  `text`. Any policy written from a Supabase tutorial will need translating.
- **The `role: authenticated` claim is load-bearing.** PostgREST picks the
  Postgres role from it. A token without it is anonymous, which fails closed —
  correct, but the symptom (signed in, sees nothing) points nowhere near the
  cause.
- **Two consoles to configure.** Firebase for sign-in methods and domains,
  Supabase for the third-party provider entry. Neither is captured in code.
- **A service-account private key now exists in the server environment.** It is
  what makes claim-writing possible and self-granting impossible.
- **ID tokens expire in an hour**, so a cold load after a longer absence renders
  as signed out until the client posts a fresh one. `/admin` bounces through
  `/signin`, which does exactly that.

---

## 7. Prisma for schema only, supabase-js for data

**Accepted · 2026-09-28**

### Context

Migrations were hand-written SQL files applied by pasting them into the Supabase
dashboard. That works, but there is no record of what has been applied, no way to
tell whether an environment is current, and nothing stopping two files from being
run out of order. A schema tool was wanted so that applying a change is one
command.

Prisma and Zod were the requested tools. The question Prisma raises is not whether
to adopt it but how far to let it in, because **Prisma bypasses Row Level
Security**. It connects directly to Postgres over a connection string and runs as
the database owner, so `app_uid()` returns null for every query it makes.

### Options

**A. Prisma for everything — schema and data access.** The conventional way to use
it. But the Supabase anon key ships to the browser, so RLS is not defence in depth
here, it is the access control. Moving reads to Prisma means every route handler
and Server Action becomes responsible for its own `where user_id = …`, and one
omission is a data leak that no policy catches. It would also duplicate the
authorisation rules: once in SQL for anything still using supabase-js, once in
TypeScript.

**B. Prisma for schema and migrations; supabase-js for data.** Prisma generates the
DDL from `schema.prisma`; everything it cannot express — RLS policies, functions,
triggers, CHECK constraints, partial indexes, storage buckets — is hand-written in
the same migration file. Runtime access stays on supabase-js, carrying the
Firebase token, subject to RLS.

**C. Keep hand-written SQL, add Zod only.** No new dependency, but also none of
what was asked for: no applied-migration history and no one-command apply.

### Decision

**Option B.** `npm run db:migrate` is the one command; authorisation stays in the
database where it holds regardless of which code path runs.

There is deliberately **no `@prisma/client` dependency** and no `generator` block.
Prisma 7's client also requires a driver adapter, which would have meant adding
`@prisma/adapter-pg` and `pg` to build a second RLS-bypassing data path for two
routes that already have one in `createServiceClient()`.

### Consequences

**Good** — migration history is tracked and `npm run db:status` answers "is this
environment current?"; the DDL is generated from the schema so tables and columns
cannot drift; `schema.prisma` is a readable map of the data model; RLS remains the
single authorisation boundary.

**Accepted** —

- **The migration file has two halves with different rules.** The generated DDL
  must never be hand-edited; the hand-written half must never be regenerated.
  Getting that backwards silently loses either a column or every policy. It is
  labelled in the file, in data-model.md, and here.
- **Prisma is blind to most of what matters.** It does not know the policies,
  functions or triggers exist, so `prisma migrate diff` against a live database
  will always report them as drift. Do not "fix" that.
- **snake_case field names**, against Prisma convention, so a row looks the same
  whether it came from Prisma or supabase-js.
- **Two connection strings** to configure, and the pooled one is the wrong choice
  for migrations in a way that fails confusingly.
- **Prisma 7 moved connection URLs into `prisma.config.ts`** and stopped
  auto-loading dotenv files, so that config file does both.

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
