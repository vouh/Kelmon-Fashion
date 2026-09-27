# Security

Trust boundaries, Row Level Security policies, and open risks.

**Current as of:** 2026-09-27.

---

## Contents

- [Trust boundaries](#trust-boundaries)
- [Authorisation layers](#authorisation-layers)
- [Row Level Security](#row-level-security)
- [Privilege escalation is blocked in the schema](#privilege-escalation-is-blocked-in-the-schema)
- [Money handling](#money-handling)
- [Idempotency](#idempotency)
- [Service-role key](#service-role-key)
- [Secrets](#secrets)
- [Input handling](#input-handling)
- [Development auth fallback](#development-auth-fallback)
- [Testing checklist](#testing-checklist)
- [Known issues and accepted risks](#known-issues-and-accepted-risks)

---

## Trust boundaries

```
┌─ Untrusted ─────────────────────────────────────────────────┐
│ Browser: anon key, cart state, form input, dev cookie       │
│ Safaricom callback body (unauthenticated — see known issues) │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌─ Server ─────────────────▼──────────────────────────────────┐
│ middleware.ts · Server Components · Server Actions · routes  │
│ Holds SUPABASE_SERVICE_ROLE_KEY and M-Pesa credentials       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌─ Database ───────────────▼──────────────────────────────────┐
│ Postgres + RLS — the actual access control                    │
└─────────────────────────────────────────────────────────────┘
```

**The single most important fact: the anon key is public and ships to the
browser.** Anyone can open the console and query the Supabase REST API with it,
bypassing the app entirely. RLS is not defence in depth for a Supabase app — it
*is* the access control.

A consequence for reviewers: testing that the UI hides something proves nothing.
Test with the anon key against the API directly.

---

## Authorisation layers

Reaching `/admin` passes three checks, then RLS:

| Layer | Where | Purpose |
|---|---|---|
| 1 | `middleware.ts` | Redirect before any admin markup is generated |
| 2 | `app/admin/layout.tsx` | Re-check on every nested route |
| 3 | `requireAdmin()` in `app/admin/actions.ts` | Server Actions are callable POST endpoints, invocable without ever loading a page |
| 4 | RLS policies | The guarantee — holds even if 1–3 are bypassed |

Layers 1–3 are redundant by design. Layer 4 is what actually protects the data.

This replaced EzyBite's single client-side check, which shipped the admin HTML to
everyone and hid it behind an overlay while Firebase resolved the session — see
[architecture.md](architecture.md#3-admin-panel-rewritten-in-nextjs).

---

## Row Level Security

RLS is enabled on **every** table in `public`. With RLS on and no matching
policy, the default is deny — so a table added without policies is inaccessible
rather than open. That is the intended failure direction.

Source: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

### The admin check

```sql
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
```

`SECURITY DEFINER` is required: the function reads `profiles`, and `profiles` has
its own RLS policies. Without it, evaluating a policy that calls `is_admin()`
would recurse into `profiles`' policies, which call `is_admin()` again.

`set search_path = public` is not cosmetic. A `SECURITY DEFINER` function without
a pinned `search_path` can be hijacked by a caller who creates a same-named table
in a schema earlier in their path.

### `profiles`

```sql
create policy "profiles: read own" on profiles
  for select using (id = auth.uid());

create policy "profiles: admin reads all" on profiles
  for select using (is_admin());

create policy "profiles: update own" on profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid())
    and loyalty_points = (select loyalty_points from profiles where id = auth.uid())
  );

create policy "profiles: admin writes all" on profiles
  for all using (is_admin()) with check (is_admin());
```

### `products`

```sql
create policy "products: public reads active" on products
  for select using (active or is_admin());
create policy "products: admin writes" on products
  for all using (is_admin()) with check (is_admin());
```

`active or is_admin()` gives admins visibility of unpublished products through
the same query the storefront uses.

### `orders`

```sql
create policy "orders: read own" on orders
  for select using (user_id = auth.uid());

create policy "orders: create own" on orders
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and payment_status = 'unpaid'
    and source = 'storefront'
    and points_awarded = false
  );

create policy "orders: admin full access" on orders
  for all using (is_admin()) with check (is_admin());
```

The insert policy pins the opening state. A client cannot create an order that
claims to be paid, nor one that pre-claims loyalty points, nor one impersonating
an admin road sale.

There is deliberately **no customer update policy**. Customers change orders
through `cancel_order()`, which enforces owner-only, unpaid-only, within five
minutes. A general update policy would let a customer set their own
`payment_status`.

### `order_items`

Access derives from the parent order rather than being duplicated:

```sql
create policy "order_items: read own" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
  );
```

### `reviews`

Public read; insert, update and delete restricted to the author; admins have full
access. `author_name` is stored separately so a deleted account's review still
renders.

### `deals`, `updates`, `salon_services`, `salon_bookings`

Content tables follow public read / admin write. `salon_bookings` follows the
`orders` pattern: read and create your own, admin sees all.

---

## Privilege escalation is blocked in the schema

Postgres has no column-level RLS, so `role` and `loyalty_points` are protected by
comparing the incoming row against the **stored** row in `WITH CHECK` (see the
`profiles` policy above). An update that changes either fails.

That is what makes this a no-op from the browser:

```sql
-- as a normal signed-in user, expect 0 rows updated
update profiles set role = 'admin' where id = auth.uid();
```

`loyalty_points` is protected the same way, because it is spendable currency.

The trade-off is the **admin bootstrap**: the first admin cannot be created
through the app and must be granted with the service role. Sign in once, then:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

Subsequent admins can be promoted by an existing admin, since
`"profiles: admin writes all"` permits it.

---

## Money handling

- `/api/orders` ignores all client-supplied prices and totals, re-pricing every
  line against `products` and recomputing the delivery fee.
- `/api/mpesa/stk-push` takes no `amount`; it reads `orders.total`.
- The RLS insert policy pins new orders to `pending` / `unpaid` / `storefront`
  with `points_awarded = false`.
- Promotion to `paid` happens only in the M-Pesa callback, via the service role.

Both flaws this fixes were live in the pre-merge code: the order route stored
whatever totals the browser sent, and the STK route charged whatever amount the
browser sent — independently, so the amount owed and the amount charged were both
under client control. Full reasoning in
[architecture.md](architecture.md#4-orders-re-priced-server-side).

---

## Idempotency

Safaricom retries callbacks, so repeated delivery must be harmless:

- `mpesa_checkout_request_id` has a **unique partial index**, so the order lookup
  cannot match two rows.
- `award_loyalty_points()` takes `FOR UPDATE` on the order row and checks
  `points_awarded`, so a duplicate cannot double-award.

EzyBite awarded points from the browser with a read-then-write flag check — a
race that two concurrent callbacks could both win.

---

## Service-role key

`createServiceClient()` in `lib/supabase/server.ts` **bypasses RLS entirely**.
It is used in exactly two places, both of which run with no user session:

| Caller | Why |
|---|---|
| `/api/mpesa/callback` | Safaricom calls it server-to-server |
| `/api/mpesa/stk-push` | Writes payment bookkeeping columns a customer cannot set |

Rules:

- Never import it into a Client Component.
- `SUPABASE_SERVICE_ROLE_KEY` must never carry a `NEXT_PUBLIC_` prefix — that
  inlines it into the client bundle and hands every visitor unrestricted database
  access.
- Every new use is a security decision. Prefer the session client and a policy.

---

## Secrets

`.gitignore` ignores every `.env` variant and un-ignores only the template:

```gitignore
.env
.env.*
!.env.example
```

This was a real gap. The previous patterns were `.env` and `*.env`, which match
neither `.env.local` nor `.env.production` — `.env` matches only that exact name,
and `*.env` matches `foo.env`. The file holding the service-role key was
therefore committable. Verify after touching `.gitignore`:

```bash
git check-ignore -v .env.local    # must report a match
```

---

## Input handling

- **Redirects** are constrained to same-site: `next` must start with a single
  `/`, so `?next=https://evil.example` and `//evil.example` both fall back to
  `/profile`. The `//` check matters — that is a protocol-relative URL browsers
  treat as absolute.
- **Phone numbers** are normalised and validated to `2547…`/`2541…` before
  reaching Safaricom.
- **Quantities** are floored with a minimum of 1.
- **Uploads** are checked for `image/*` and a 5 MB ceiling client-side, and the
  Storage bucket policy restricts writes to admins.
- **XSS** is handled by React's default escaping. The one
  `dangerouslySetInnerHTML` is the inline theme script in `app/layout.tsx`, a
  static string with no interpolation.
- **SQL injection** is not reachable: all queries go through PostgREST's
  parameterised builder, and the SQL functions take typed arguments.

---

## Development auth fallback

`lib/dev-auth.ts` permits a cookie-based admin login, gated on **both**
`NODE_ENV !== "production"` **and** Supabase being unconfigured. The role is
re-derived from the email server-side, so a forged cookie grants nothing.

Verified against a real production build:

| Test | Expected | Result |
|---|---|---|
| `POST /api/dev-auth` in production | 404 | 404 |
| `/admin` + admin cookie in production | redirect | 307 |
| Forged cookie `{"role":"admin"}` in dev | refused | 307 |
| Non-admin email in dev | `customer` | refused |

Details and removal procedure in
[architecture.md](architecture.md#5-development-only-auth-fallback).

---

## Testing checklist

After changing any policy:

1. **As anonymous** — can you read only active products? Zero orders?
2. **As a customer** — only your own orders? Can you `update` your `role`
   (expect 0 rows)? Your `loyalty_points`?
3. **As another customer** — can you read customer A's orders by id?
4. **As admin** — full access to orders, products, reviews, deals, updates?
5. **Insert an order** with `payment_status: 'paid'` as a customer — must fail.
6. **Review the service-role call sites** — still only the two above?

Run these with the anon key against the REST API, not through the UI.

---

## Known issues and accepted risks

Open items as of 2026-09-27, listed so they are decisions rather than oversights.
None is a reason not to launch; several should be closed before significant
volume. Severity is about impact on Kelmon, not CVSS.

### High

#### 1. M-Pesa callbacks are unauthenticated

`/api/mpesa/callback` accepts any POST. Safaricom does not sign callbacks, so the
handler cannot distinguish a genuine result from a forged one.

**Impact.** Anyone who learns a `CheckoutRequestID` can mark that order paid
without paying, and trigger a loyalty-points award.

**Why it is hard to exploit.** The id is generated by Safaricom, never returned
to the storefront UI, and unguessable. Only the initiating client sees its own.

**Mitigation available now:** restrict the route to Safaricom's published egress
IP ranges at the edge, and reconcile against the Daraja transaction-status API
before treating an order as paid.

**Accepted for now** because the id is unguessable and order values are small.
Revisit before scaling.

#### 2. A price change mid-session charges the new price silently

`/api/orders` re-prices from the catalogue and ignores the client's figures —
correct for preventing tampering, but a customer who loaded the page before a
price rise is charged the higher amount with no warning.

**Fix:** have the client send the total it displayed, compare server-side, and
return `409` with both figures so the UI can re-confirm. The submitted figure is
still never used for the charge — only for detecting drift.

### Medium

#### 3. No rate limiting anywhere

Notably `/api/mpesa/stk-push` — repeated calls spam a customer's handset with PIN
prompts and burn Daraja quota. Also `/api/orders`, and Server Actions.

Supabase Auth rate-limits sign-in attempts, so credential stuffing is partly
covered. Nothing else is.

#### 4. No audit log of admin actions

Admins can delete orders, reviews and products with no record of who did what.
With more than one admin there is no way to attribute a deletion.

**Fix:** an insert-only `audit_log` table written by each Server Action (actor,
action, target, timestamp, before/after).

Related: `deleteOrder` and `deleteProduct` are hard deletes.

#### 5. Stock is never decremented

`products.stock` is displayed and editable but no order reduces it. Inventory
shown to customers drifts from reality, and overselling is possible.

**Fix:** decrement inside a transaction at order creation, with the existing
`check (stock >= 0)` rejecting oversells. Decide whether to reserve at order time
or payment time — reserving at payment risks selling an item twice while a PIN
prompt is pending.

#### 6. Salon bookings are not wired up

`salon_bookings`, its RLS policies and `lib/supabase/salon.ts` all exist, but
`/salon` is still the waitlist UI. Not a defect — it needs availability and
scheduling decisions. The schema is ready.

### Low

#### 7. No guest checkout

`createOrder()` requires a session and the RLS insert policy requires
`user_id = auth.uid()`. Deliberate — it makes order history and loyalty points
coherent — but it is a conversion cost.

#### 8. Seed image URLs are borrowed and will expire

`supabase/seed.sql` and `lib/dev-fixtures.ts` point at
`lh3.googleusercontent.com` URLs carried over from the original hardcoded
catalogue. Not Kelmon's, not permanent. Replace with real photography.

#### 9. `TransactionDesc` length cap is a guess

`TRANSACTION_DESC_MAX = 60` in `lib/mpesa.ts`. Harmless — the string is truncated
— but worth confirming against the Daraja spec for the live shortcode.

#### 10. No automated tests

Verification so far has been manual: typecheck, build, route smoke tests, and the
dev-auth guard checks above.

**Highest-value tests first:**

1. RLS policies — a customer cannot read another's orders, cannot change their
   own `role`, cannot insert a paid order.
2. `/api/orders` re-pricing — a tampered price is ignored.
3. `normalizeKenyanPhone()` — table-driven, including rejections.
4. `award_loyalty_points()` — a second call awards zero.

The RLS tests are worth writing first: they cover the actual security boundary
and are cheap against a local Supabase stack.

#### 11. Pre-existing lint warnings

Four warnings in components untouched by the merge: unused variables in
`CircleCollection.tsx`, `HeroSlider.tsx`, `ProductCarousel.tsx`, and a
`no-page-custom-font` warning for the Material Symbols stylesheet in
`app/layout.tsx`. Cosmetic.

---

## Reporting

Security issues: **info@globalsolutionsug.com**. Please do not open a public
issue for anything in the High section.
