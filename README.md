# Kelmon

Campus fashion, beauty and salon platform for Kenya. Next.js 15 (App Router) +
Supabase + M-Pesa.

This repo is the result of merging two projects that previously shared this
folder: **Kelmon** (the Next.js storefront) and **EzyBite** (a vanilla
HTML/Firebase food-delivery app). EzyBite's storefront was removed; its admin
panel and backend were ported to Next.js + Supabase and re-skinned for Kelmon.
See [Provenance](#provenance) for the mapping.

📚 **Full technical documentation is in [`docs/`](docs/README.md)** — architecture
and decision records, database schema and RLS, API reference, M-Pesa and Google
OAuth setup, deployment checklist, security model, and operator guides for the
admin panel.

---

## Stack

| Concern  | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript |
| Styling | Tailwind CSS v3 + CSS custom properties (`styles/design.css`) |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth (Google OAuth + email/password) |
| File storage | Supabase Storage (`product-images` bucket) |
| Payments | M-Pesa STK Push (Safaricom Daraja) |

**Why Supabase Auth rather than Firebase Auth:** Supabase Auth issues the JWT
that Row Level Security reads, so authorisation rules live in the schema
(`supabase/migrations/0001_init.sql`) instead of in app code. Pairing Firebase
Auth with a Supabase database would require signing a custom JWT and bridging it
into every RLS policy. Google sign-in is free on both.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the Supabase project

Create a project at [supabase.com](https://supabase.com), then apply the schema.
Either paste `supabase/migrations/0001_init.sql` into the dashboard SQL editor,
or use the CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in the Supabase URL, anon key, and service-role key from
**Project Settings → API**. The service-role key bypasses RLS and must never be
given a `NEXT_PUBLIC_` prefix — it is used only by the M-Pesa callback, which
arrives with no user session.

### 4. Enable Google sign-in

1. **Google Cloud Console → Credentials** → create an OAuth 2.0 client (Web).
   Authorised redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Providers → Google** → paste the client ID and
   secret.
3. **Supabase → Authentication → URL Configuration → Redirect URLs** → add
   `http://localhost:3000/auth/callback` and your production equivalent.

### 5. Seed and grant yourself admin

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

This loads the products and salon services. The admin grant at the bottom of
that file needs your account to exist first, so **sign in once**, then edit the
email in `supabase/seed.sql` and re-run it (it is idempotent).

`profiles.role` is deliberately not client-writable — the RLS update policy
re-reads the stored row, so a user cannot promote themselves. The first admin
must be set with the service role.

### 6. Run

```bash
npm run dev
```

The app runs without Supabase configured: pages render with empty catalogues and
`/admin` redirects. Nothing crashes on a fresh clone.

### M-Pesa in development

Safaricom must reach your callback over public HTTPS, so tunnel it:

```bash
npx ngrok http 3000
# then set MPESA_CALLBACK_URL=https://<id>.ngrok-free.app/api/mpesa/callback
```

Leave `MPESA_TILL_NUMBER` blank for Paybill. Set it to collect on a till, which
switches `PartyB` to the till and the transaction type to
`CustomerBuyGoodsOnline`.

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## Layout

```
app/
  (storefront)      /, shop, product/[id], salon, cart, checkout,
                    orders, profile, about, contact, signin
  admin/            dashboard, orders, products, stats, deals,
                    updates, reviews, transactions[/failed]
  admin/actions.ts  all admin mutations as Server Actions
  api/
    orders/         create an order (re-prices server-side)
    mpesa/stk-push/ start a payment
    mpesa/callback/ Safaricom result handler
  auth/callback/    OAuth code exchange
components/
  admin/            AdminShell, managers, BarChart
  providers/        Auth, Cart, Theme, Toast
  home|shop|product|layout|salon|ui/
lib/
  supabase/         client, server, types, products, orders, content,
                    stats, salon
  mpesa.ts          STK push
  products.ts       Product type, row mapper, formatKes
middleware.ts       session refresh + /admin gate
supabase/
  migrations/0001_init.sql
  seed.sql
```

## Security model

- **RLS on every table.** Customers read and write only their own orders,
  bookings and profile; products/deals/updates are public-read; admin writes go
  through an `is_admin()` policy.
- **Two independent admin checks.** `middleware.ts` redirects non-admins before
  any admin markup renders, and `app/admin/layout.tsx` re-checks server-side.
  Server Actions check again, so a direct action call can't bypass the UI.
- **Money is never trusted from the client.** `/api/orders` re-prices every line
  against the `products` table and recomputes the delivery fee;
  `/api/mpesa/stk-push` reads the amount from the order row.
- **Order status is pinned on insert.** The RLS policy only accepts
  `pending`/`unpaid`, so a client cannot open an order that claims to be paid.
  Promotion to paid happens only in the callback, via the service role.
- **Loyalty points are awarded in Postgres** (`award_loyalty_points`), which is
  idempotent — a duplicate M-Pesa callback cannot double-award.

## Provenance

What happened to each part of EzyBite:

| EzyBite | Became |
|---|---|
| `index.html`, `pages/`, `js/app.js`, `js/ui-components.js`, `assets/` | Deleted (storefront replaced by Kelmon's) |
| `admin/*.html` + `admin-shell.js` | `app/admin/*` + `components/admin/AdminShell.tsx` |
| `admin/admin-auth.js` (hardcoded email list, client-side gate) | `middleware.ts` + `app/admin/layout.tsx` + `profiles.role` |
| `js/firebase-service.js` (`window.fb_*`) | `lib/supabase/*` + `app/admin/actions.ts` |
| `js/auth.js` (`getAuthErrorMessage`) | `authErrorMessage()` in `AuthProvider.tsx` |
| `api/stkpush.js` | merged into `lib/mpesa.ts` + `app/api/mpesa/stk-push/route.ts` |
| `api/callback.js` | `app/api/mpesa/callback/route.ts` |
| Firestore `users` / `bitePoints` | `profiles` / `loyalty_points` (tiers rescaled for fashion prices) |
| Firestore `customOrders` | `salon_bookings` |
| Chart.js via CDN (`admin/stats.html`) | `components/admin/BarChart.tsx` (inline SVG, no dependency) |
| — | `products` table + admin products CRUD (**new**; EzyBite's menu was hardcoded) |

A `git` snapshot of both projects before the merge is the first commit, so
anything removed is recoverable.
