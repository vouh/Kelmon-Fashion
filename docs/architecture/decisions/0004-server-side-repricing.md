# ADR-0004 — Re-price orders server-side

- **Status:** Accepted
- **Date:** 2026-09-27

## Context

Two money-handling flaws were found in the pre-merge code while porting it.

**1. `/api/orders` stored client-supplied totals.**

```ts
// app/api/orders/route.ts — before
const body = (await request.json()) as CreateOrderBody;
const order: OrderRecord = {
  subtotal: body.subtotal,       // from the browser
  deliveryFee: body.deliveryFee, // from the browser
  total: body.total,             // from the browser
  lines: body.lines,             // including each line's price
};
await saveOrder(order);
```

Nothing compared these against the catalogue. A crafted POST could create a
genuine order for an KES 8,500 bag with `total: 1`.

**2. `/api/mpesa/stk-push` charged a client-supplied amount.**

```ts
const { orderId, phone, amount } = body;
const result = await initiateStkPush({ phone, amount, orderId });
```

The STK prompt was for `amount` from the request, not the order's value. The
customer could approve a payment far smaller than the order, and the callback
would then mark that order fully paid.

Together these meant the amount charged and the amount owed were both under
client control, independently.

## Options considered

### A. Validate on the client, trust it on the server
Cheapest, and worthless. Client-side validation is a UX feature, not a control.

### B. Validate totals server-side by recomputing and comparing
Recompute from the catalogue, reject if the submitted total differs.

Rejecting on mismatch produces false failures whenever a price legitimately
changes between page load and checkout — which is normal, not an attack.

### C. Recompute server-side and ignore the client's figures entirely
The client sends *what* is being bought (product ids, quantities, variants);
the server decides *what it costs*.

## Decision

**Option C**, plus reading the M-Pesa amount from the stored order.

`/api/orders` now:

1. Collects the distinct `productId`s from the submitted lines.
2. Fetches those rows from `products`.
3. Rejects the order if any product is missing or `active = false`.
4. Rebuilds each line using the **database** `name`, `price`, `image` and
   `category`, keeping only `quantity` (floored, minimum 1) and `variant` from
   the client.
5. Computes `subtotal` via `cartSubtotal()` and the fee via `deliveryFeeFor()`.

`/api/mpesa/stk-push` no longer accepts `amount` at all. It selects the order —
a query RLS scopes to the caller's own orders, so this doubles as the
authorisation check — and charges `order.total`.

## Consequences

**Good**

- Order value and charged amount both derive from server state only.
- A price change between page load and checkout charges the current price rather
  than failing.
- Delisted products cannot be ordered: `active = false` rejects with 409.
- The RLS select in the STK route means a user cannot start a payment against
  someone else's order without a separate ownership check.

**Bad / accepted**

- One extra query per checkout (`products … in (ids)`). Negligible, and indexed.
- **The customer can be charged a different price than the one displayed**, if
  the catalogue changed mid-session. The correct behaviour is to detect the
  difference and confirm with the customer before charging. Currently the server
  silently uses the new price. Recorded in
  [security/known-issues.md](../../security/known-issues.md).

## Related defence in depth

The RLS insert policy on `orders` independently pins the opening state:

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
order that claims to be already paid, or one that pre-claims loyalty points.
Promotion to `paid` happens only in the M-Pesa callback, using the service-role
key.
