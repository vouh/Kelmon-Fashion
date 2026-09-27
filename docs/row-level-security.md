# Row Level Security

RLS is enabled on **every** table in `public`. With RLS on and no matching
policy, the default is deny — so a table added without policies is inaccessible
rather than open. That is the intended failure direction.

Source: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

## Why this matters more than usual here

The `anon` key ships to the browser. Anyone can open the console and issue
arbitrary queries against the REST API with it. RLS is not defence in depth for
a Supabase app — it *is* the access control. Route handlers and Server Actions
add clarity and better errors, but they are not what stops a determined caller.

Test policies by querying with the anon key directly, not only through the app.

## The admin check

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
a pinned `search_path` can be hijacked by a caller who creates a same-named
table in a schema earlier in their path.

## Policies by table

### `profiles` — the important one

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

Postgres has no column-level RLS, so `role` and `loyalty_points` are protected
by comparing the incoming row against the **stored** row in `WITH CHECK`. An
update that changes either fails.

This is what makes `update profiles set role = 'admin' where id = auth.uid()`
from the browser a no-op. Verify it after any change to this table:

```sql
-- as a normal signed-in user, expect 0 rows updated
update profiles set role = 'admin' where id = auth.uid();
```

The consequence is the [admin bootstrap problem](environment.md#first-admin):
the first admin must be granted with the service role.

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
claims to be paid, nor one that pre-claims loyalty points, nor one that
impersonates an admin-created road sale. Promotion to `paid` happens only in the
M-Pesa callback via the service-role key.

There is deliberately **no customer update policy**. Customers change orders
through `cancel_order()`, which enforces owner-only, unpaid-only, within five
minutes. Allowing a general update would let a customer set their own
`payment_status`.

### `order_items`

Access is derived from the parent order rather than duplicated:

```sql
create policy "order_items: read own" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
  );
```

### `reviews`

Public read; insert, update and delete restricted to the author; admins have
full access. `author_name` is stored separately so a deleted account's review
still renders.

### `deals`, `updates`, `salon_services`, `salon_bookings`

Content tables follow `public read / admin write`. `salon_bookings` follows the
`orders` pattern: read and create your own, admin sees all.

## Service-role usage

`createServiceClient()` in `lib/supabase/server.ts` **bypasses RLS entirely**.
It is used in exactly two places, both of which run with no user session:

| Caller | Why |
|---|---|
| `/api/mpesa/callback` | Safaricom calls it server-to-server; no session exists |
| `/api/mpesa/stk-push` | Writes payment bookkeeping columns a customer cannot set |

Rules:

- Never import it into a Client Component.
- `SUPABASE_SERVICE_ROLE_KEY` must never carry a `NEXT_PUBLIC_` prefix.
- Every new use is a security decision. Prefer the session client and a policy.

## Testing checklist

After changing any policy:

1. **As anonymous** — can you read only active products? Zero orders?
2. **As a customer** — only your own orders? Can you `update` your `role`
   (expect 0 rows)? Your `loyalty_points`?
3. **As another customer** — can you read customer A's orders by id?
4. **As admin** — full access to orders, products, reviews, deals, updates?
5. **Insert an order** with `payment_status: 'paid'` as a customer — must fail.
6. **Review the service-role call sites** — still only the two above?
