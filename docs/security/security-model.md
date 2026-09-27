# Security Model

## Trust boundaries

```
┌─ Untrusted ─────────────────────────────────────────────────┐
│ Browser: anon key, cart state, form input, dev cookie       │
│ Safaricom callback body (unauthenticated — see known-issues) │
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

The critical point: **the anon key is public and ships to the browser.** Anyone
can query the Supabase REST API with it directly, bypassing the app entirely.
Route handlers and Server Actions are not the security boundary — RLS is.

A consequence for reviewers: testing that the UI hides something proves nothing.
Test with the anon key against the API.

## Authorisation layers

Reaching `/admin` passes three checks, then RLS:

| Layer | Where | Purpose |
|---|---|---|
| 1 | `middleware.ts` | Redirect before any admin markup is generated |
| 2 | `app/admin/layout.tsx` | Re-check on every nested route |
| 3 | `requireAdmin()` in `app/admin/actions.ts` | Server Actions are callable POST endpoints, invocable without loading a page |
| 4 | RLS policies | The guarantee. Holds even if 1–3 are bypassed |

Layers 1–3 are redundant by design. Layer 4 is what actually protects the data.

This replaced EzyBite's single client-side check, which shipped the admin HTML to
everyone and hid it behind an overlay while Firebase resolved — see
[ADR-0003](../architecture/decisions/0003-admin-panel-in-nextjs.md).

## Privilege escalation is blocked in the schema

`profiles.role` is not client-writable. Postgres has no column-level RLS, so the
update policy compares the incoming row against the stored one:

```sql
with check (
  id = auth.uid()
  and role = (select role from profiles where id = auth.uid())
  and loyalty_points = (select loyalty_points from profiles where id = auth.uid())
)
```

So `update profiles set role = 'admin' where id = auth.uid()` from the browser
affects zero rows. Same for `loyalty_points`, which is otherwise spendable
currency.

The trade-off is the [admin bootstrap](../operations/environment.md#first-admin):
the first admin must be granted with the service role.

## Money

Established in [ADR-0004](../architecture/decisions/0004-server-side-repricing.md).

- `/api/orders` ignores all client-supplied prices and totals, re-pricing every
  line against `products` and recomputing the delivery fee.
- `/api/mpesa/stk-push` takes no `amount`; it reads `orders.total`.
- The RLS insert policy pins new orders to `pending` / `unpaid` / `storefront`
  with `points_awarded = false`, so a client cannot open an order that claims to
  be paid.
- Promotion to `paid` happens only in the M-Pesa callback, via the service role.

Both flaws this fixes were live in the pre-merge code: the order route stored
whatever totals the browser sent, and the STK route charged whatever amount the
browser sent.

## Idempotency

Safaricom retries callbacks, so repeated delivery must be harmless:

- `mpesa_checkout_request_id` has a unique partial index, so the order lookup
  cannot match two rows.
- `award_loyalty_points()` takes `FOR UPDATE` and checks `points_awarded`, so a
  duplicate cannot double-award.

EzyBite awarded points from the browser with a read-then-write flag check — a
race two concurrent callbacks could both win.

## Service-role key

Bypasses RLS completely. Used in exactly two places, both without a user session:

| Caller | Why |
|---|---|
| `/api/mpesa/callback` | Server-to-server from Safaricom |
| `/api/mpesa/stk-push` | Writes payment columns a customer cannot set |

Rules: never import into a Client Component; never prefix with
`NEXT_PUBLIC_`; treat each new use as a security decision.

## Secrets

`.gitignore` ignores `.env` and `.env.*`, un-ignoring only `.env.example`. The
previous patterns matched neither `.env.local` nor `.env.production`, so the file
holding the service-role key was committable. Confirm with
`git check-ignore -v .env.local`.

## Input handling

- **Redirects** are constrained to same-site: `next` must start with a single
  `/`, so `?next=https://evil.example` and `//evil.example` both fall back to
  `/profile`.
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

## Development auth fallback

`lib/dev-auth.ts` permits a cookie-based admin login, gated on `NODE_ENV !==
"production"` **and** Supabase being unconfigured. The role is re-derived from
the email server-side, so a forged cookie grants nothing.

Verified against a real production build: the endpoint 404s and the cookie is
ignored. Details and the removal procedure in
[ADR-0005](../architecture/decisions/0005-dev-auth-fallback.md).

## Not implemented

See [known-issues.md](known-issues.md) for the full list. The most significant:
M-Pesa callbacks are unauthenticated, there is no rate limiting, and there is no
audit log of admin actions.
