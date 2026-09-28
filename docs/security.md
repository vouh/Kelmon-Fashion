# Security

Trust boundaries, Row Level Security policies, and open risks.

**Current as of:** 2026-09-28.

---

## Contents

- [Trust boundaries](#trust-boundaries)
- [Authentication](#authentication)
- [Authorisation layers](#authorisation-layers)
- [Row Level Security](#row-level-security)
- [Storage](#storage)
- [Privilege escalation is blocked in the schema](#privilege-escalation-is-blocked-in-the-schema)
- [Money handling](#money-handling)
- [Idempotency](#idempotency)
- [Service-role key](#service-role-key)
- [Secrets](#secrets)
- [Input handling](#input-handling)
- [Testing checklist](#testing-checklist)
- [Known issues and accepted risks](#known-issues-and-accepted-risks)

---

## Trust boundaries

```
┌─ Untrusted ─────────────────────────────────────────────────┐
│ Browser: anon key, cart state, form input, the token cookie  │
│ Safaricom callback body (unauthenticated — see known issues) │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌─ Trusted issuer ─────────▼──────────────────────────────────┐
│ Firebase Auth — signs ID tokens, holds the custom claims     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌─ Server ─────────────────▼──────────────────────────────────┐
│ middleware.ts · Server Components · Server Actions · routes  │
│ Verifies tokens with the Admin SDK private key               │
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

## Authentication

Firebase Auth issues identity; Supabase enforces access. Supabase is configured
with Firebase as a third-party auth provider (dashboard -> Authentication -> Third
Party Auth), so it accepts Firebase ID tokens directly and no second session
exists to fall out of step with the first.

**The token is the whole join.** `lib/supabase/client.ts` and
`lib/supabase/server.ts` pass it as Supabase's `accessToken`, and Supabase
validates the signature against Google's published keys before PostgREST ever
sees the request. A user id in this system is a Firebase UID — a string, not a
uuid — which is why `auth.uid()` is unusable here and `app_uid()` replaces it.

### Custom claims

Two claims, both written server-side only, by the Admin SDK in
`lib/firebase/admin.ts`:

| Claim | Set to | Why |
|---|---|---|
| `role` | `"authenticated"` | **Required.** PostgREST reads `role` to pick the Postgres role for the request. A Firebase token without it is treated as anonymous, and every policy that expects a signed-in user fails closed |
| `admin` | `true` for admins | Read by `is_admin()` in Postgres, so the admin check costs no table read |

A claim can never be self-granted: writing one needs the service-account private
key, which only the server has. `admin` comes from the `ADMIN_EMAILS` allowlist or
from an existing admin, and `setAdminClaim()` revokes refresh tokens so a change
takes effect immediately rather than whenever the current token expires.

### The token cookie

Firebase keeps its session in IndexedDB, which the server cannot read, so
`AuthProvider` mirrors the ID token into an httpOnly `kelmon-token` cookie on
sign-in and on every refresh, and `/api/auth/session` verifies it before storing
it. An ID token is stored rather than a Firebase session cookie because Supabase
accepts only the `securetoken.google.com` issuer.

The cookie is httpOnly, `sameSite: lax`, and `secure` in production. It holds a
token that expires within the hour, and possessing it is not itself
authorisation: every path that matters verifies the signature.

---

## Authorisation layers

Reaching `/admin` passes three checks, then RLS:

| Layer | Where | Purpose |
|---|---|---|
| 1 | `middleware.ts` | Redirect before any admin markup is generated. **Decodes the token, does not verify it** — see below |
| 2 | `app/admin/layout.tsx` | Verifies the signature with the Admin SDK, on every nested route |
| 3 | `requireAdmin()` in `app/admin/actions.ts` | Server Actions are callable POST endpoints, invocable without ever loading a page |
| 4 | RLS policies | The guarantee — holds even if 1–3 are bypassed |

Layer 1 runs on the Edge runtime, where the Admin SDK's Node crypto cannot load,
so `peekIdToken()` reads the JWT payload **without checking the signature**. That
is safe only because it decides nothing but a redirect: a forged cookie gets past
layer 1 and is then stopped by layer 2 and by RLS. Never authorise a read or a
write on a peeked claim.

Layers 1–3 are redundant by design. Layer 4 is what actually protects the data.

This replaced EzyBite's single client-side check, which shipped the admin HTML to
everyone and hid it behind an overlay while Firebase resolved the session — see
[architecture.md](architecture.md#3-admin-panel-rewritten-in-nextjs).

---

## Row Level Security

RLS is enabled on **every** table in `public`. With RLS on and no matching
policy, the default is deny — so a table added without policies is inaccessible
rather than open. That is the intended failure direction.

Source: [`supabase/migrations/0003_firebase_auth.sql`](../supabase/migrations/0003_firebase_auth.sql),
which restates every policy in full. 0001 is the original uuid-identity version
and is superseded by it.

### Identity

```sql
create or replace function public.app_uid()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  );
$$;
```

`auth.uid()` casts the `sub` claim to uuid and a Firebase UID is not one, so
every policy uses `app_uid()` instead. It returns null for an unauthenticated
request, and `column = null` is never true — so an anonymous caller matches no
owner row, which is the right failure direction.

### The admin check

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.app_is_admin_claim()
      or exists (
        select 1 from public.profiles
        where id = public.app_uid() and role = 'admin'
      );
$$;
```

Claim first, table second. The claim is already in the verified token, so the
common case costs no read; `profiles.role` covers the window between a grant and
the user's next token refresh, and is the record that survives re-minting.

`SECURITY DEFINER` is required: the function reads `profiles`, and `profiles` has
its own RLS policies. Without it, evaluating a policy that calls `is_admin()`
would recurse into `profiles`' policies, which call `is_admin()` again.

`set search_path = public` is not cosmetic. A `SECURITY DEFINER` function without
a pinned `search_path` can be hijacked by a caller who creates a same-named table
in a schema earlier in their path.

### `profiles`

```sql
create policy "profiles: read own" on profiles
  for select using (id = public.app_uid());

create policy "profiles: admin reads all" on profiles
  for select using (public.is_admin());

-- role and loyalty_points are guarded by a trigger, not by this policy.
create policy "profiles: update own" on profiles
  for update using (id = public.app_uid())
  with check (id = public.app_uid());

create policy "profiles: admin writes all" on profiles
  for all using (public.is_admin()) with check (public.is_admin());
```

Rows are created by `/api/auth/session` on first sign-in, with the service role.
There is no insert policy for clients and no trigger on `auth.users` to create
one, because Firebase users never appear in that table.

### `products`

```sql
create policy "products: public reads active" on products
  for select using (active or public.is_admin());
create policy "products: admin writes" on products
  for all using (public.is_admin()) with check (public.is_admin());
```

`active or is_admin()` gives admins visibility of unpublished products through
the same query the storefront uses.

### `orders`

```sql
create policy "orders: read own" on orders
  for select using (user_id = public.app_uid());

create policy "orders: create own" on orders
  for insert with check (
    user_id = public.app_uid()
    and status = 'pending'
    and payment_status = 'unpaid'
    and source = 'storefront'
    and points_awarded = false
  );

create policy "orders: admin full access" on orders
  for all using (public.is_admin()) with check (public.is_admin());
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
    exists (select 1 from orders o where o.id = order_id and o.user_id = public.app_uid())
  );
```

### `reviews`

Public read; insert, update and delete restricted to the author; admins have full
access. `author_name` is stored separately so a deleted account's review still
renders.

### `deals`, `updates`

Content tables follow public read / admin write. The salon tables these notes
also covered were dropped in `0002_remove_salon.sql`.

---

## Storage

Three buckets, all public-read, because a product photo on a storefront is meant
to be fetchable by anyone with the URL. Writes are what is restricted:

| Bucket | Path shape | Write |
|---|---|---|
| `product-images` | `<slug>/<timestamp>-<random>.<ext>` | `is_admin()` |
| `deal-images` | `<timestamp>-<random>.<ext>` | `is_admin()` |
| `avatars` | `<firebase-uid>/<timestamp>.<ext>` | owner only |

The avatars policy compares `(storage.foldername(name))[1]` against
`app_uid()`, so a signed-in user can write only inside the folder named after
their own UID — not over somebody else's photo.

Each bucket also carries a `file_size_limit` and an `allowed_mime_types` list, so
an oversized or non-image upload is refused by Storage itself. The checks in
`lib/supabase/storage.ts` exist to produce a message naming the file, not to
provide the guarantee.

---

## Privilege escalation is blocked in the schema

Postgres has no column-level RLS, so `role` and `loyalty_points` are protected by
a `BEFORE UPDATE` trigger, `guard_profile_columns()`, which raises unless the
caller is an admin or the service role:

```sql
if new.role is distinct from old.role then
  raise exception 'profiles.role is not client-writable.';
end if;
```

That is what makes this fail from the browser:

```sql
-- as a normal signed-in user
update profiles set role = 'admin' where id = app_uid();
-- ERROR: profiles.role is not client-writable.
```

`loyalty_points` is protected the same way, because it is spendable currency —
only `award_loyalty_points()` and `redeem_loyalty_points()` may move it, and both
are `SECURITY DEFINER`.

0001 did this inside the RLS `WITH CHECK` instead, by re-reading the stored row. A
trigger was chosen in 0003 for two reasons: it also covers writes arriving through
the admin policy, and it raises rather than letting a rejected write look like a
no-op.

### The admin bootstrap

Neither the claim nor `profiles.role` can be self-granted, so the first admin has
to come from outside the app. Set `ADMIN_EMAILS` in `.env.local`; on that
account's next sign-in, `/api/auth/session` writes both the `admin` claim and
`profiles.role`. Subsequent admins can be promoted by an existing admin, since
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
It is used in exactly three places, each of which must write something the
caller themselves may not:

| Caller | Why |
|---|---|
| `/api/mpesa/callback` | Safaricom calls it server-to-server, with no session |
| `/api/mpesa/stk-push` | Writes payment bookkeeping columns a customer cannot set |
| `/api/auth/session` | Creates the `profiles` row on first sign-in, and writes `role`, which is not client-writable |

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
- **Uploads** are checked for an image MIME type and a size ceiling client-side,
  and again by the bucket's own `allowed_mime_types` / `file_size_limit`. Writes
  are restricted by policy to admins, or to the owner's own folder for avatars.
- **XSS** is handled by React's default escaping. The one
  `dangerouslySetInnerHTML` is the inline theme script in `app/layout.tsx`, a
  static string with no interpolation.
- **SQL injection** is not reachable: all queries go through PostgREST's
  parameterised builder, and the SQL functions take typed arguments.

---

## Testing checklist

After changing any policy:

1. **As anonymous** — can you read only active products? Zero orders?
2. **As a customer** — only your own orders? Does `update profiles set role`
   raise? `loyalty_points` too?
3. **As another customer** — can you read customer A's orders by id?
4. **As admin** — full access to orders, products, reviews, deals, updates?
5. **Insert an order** with `payment_status: 'paid'` as a customer — must fail.
6. **Review the service-role call sites** — still only the three above?
7. **Without the `role: authenticated` claim** — a Firebase token missing it must
   behave as anonymous, not as a signed-in user.
8. **Upload an avatar** into another user's UID folder — must be refused.

Run these with the anon key plus a real Firebase ID token against the REST API,
not through the UI.

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

Firebase Auth rate-limits sign-in attempts per IP and per account, so credential
stuffing is partly covered. Nothing else is.

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

#### 6. A stale claim outlives a revoked admin

`is_admin()` accepts the `admin` claim from the token. Revoking admin by editing
`profiles.role` alone leaves the claim valid until the token is re-minted — up to
an hour. `setAdminClaim()` calls `revokeRefreshTokens()` to close that window, so
use it rather than a direct table update.

**Fix if this needs to be exact:** pass `checkRevoked: true` to `verifyIdToken()`
on admin paths, at the cost of a network round trip per request.

### Low

#### 7. No guest checkout

`createOrder()` requires a session and the RLS insert policy requires
`user_id = app_uid()`. Deliberate — it makes order history and loyalty points
coherent — but it is a conversion cost.

#### 8. Preset avatar URLs are borrowed and will expire

`lib/avatars.ts` points at `lh3.googleusercontent.com` URLs carried over from the
original design mockups. Not Kelmon's, and not permanent. The seeded product
catalogue that shared this problem is gone — products are uploaded to the
`product-images` bucket now — so this is the last of it.

#### 9. `TransactionDesc` length cap is a guess

`TRANSACTION_DESC_MAX = 60` in `lib/mpesa.ts`. Harmless — the string is truncated
— but worth confirming against the Daraja spec for the live shortcode.

#### 10. No automated tests

Verification so far has been manual: typecheck, build, and route smoke tests.

The highest-risk untested surface is now the token path: a wrong `role` claim, an
expired cookie, or a missing Third Party Auth entry all present as "signed in but
sees nothing", and nothing currently catches a regression there.

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
