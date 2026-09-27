# Data Model

The complete data model: every table, column, relationship, constraint, function
and trigger, with the reasoning where a choice is not obvious.

Source of truth: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
TypeScript mirror: [`lib/supabase/types.ts`](../lib/supabase/types.ts).
Access rules: [security.md](security.md#row-level-security).

If you change the SQL, change the types too — they are hand-written, not
generated. To regenerate instead:

```bash
npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
```

## Entity relationships

```
auth.users ──1:1── profiles
                     │
      ┌──────────────┴──────────────┐
      │                             │
   orders ──1:N── order_items    salon_bookings
                     │                  │
                 products ──┐      salon_services
                            │
                        reviews

deals, updates  (standalone content tables)
```

## Enums

| Type | Values |
|---|---|
| `user_role` | `customer`, `admin` |
| `order_status` | `pending`, `awaiting_mpesa`, `confirmed`, `packed`, `delivered`, `cancelled` |
| `payment_status` | `unpaid`, `initiated`, `paid`, `failed` |
| `payment_method` | `mpesa`, `cod` |
| `order_source` | `storefront`, `admin_direct` |
| `booking_status` | `pending`, `confirmed`, `completed`, `cancelled` |

`order_status` is the union of EzyBite's status strings and Kelmon's original
`OrderStatus`. Payment state is tracked **separately** from fulfilment state —
an order can be `delivered` + `unpaid` (cash on delivery not yet collected), or
`pending` + `paid`. Collapsing them into one column was the original EzyBite
design and it could not express those combinations.

## Tables

### `profiles`

One row per `auth.users` row, created automatically by the `handle_new_user`
trigger on signup.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK → `auth.users`, `on delete cascade` |
| `email` | `text` | |
| `full_name` | `text` | From Google OAuth metadata, or the signup form |
| `phone` | `text` | |
| `campus` | `text` | |
| `avatar_url` | `text` | From Google, if present |
| `role` | `user_role` | Default `customer`. **Not client-writable** |
| `loyalty_points` | `integer` | Default 0, `check >= 0`. EzyBite's `bitePoints` |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` maintained by trigger |

`role` and `loyalty_points` cannot be changed by the account holder — the RLS
update policy re-reads the stored row and requires both to be unchanged. See
[security.md](security.md#row-level-security).

### `products`

New table. EzyBite had no products collection; its menu was hardcoded, as was
Kelmon's original `lib/products.ts`.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | Slug, e.g. `lv-speedy-bag` |
| `name` | `text` | |
| `description` | `text` | |
| `price` | `numeric(10,2)` | `check >= 0` |
| `original_price` | `numeric(10,2)` | `check >= price` — a "was" price must exceed the current one |
| `category` | `text` | Free text; live list derived by `getCategories()` |
| `images` | `text[]` | First element is the card image |
| `sizes` | `text[]` | e.g. `{S,M,L}` or `{30ml,50ml,100ml}` |
| `colors` | `text[]` | |
| `stock` | `integer` | `check >= 0` |
| `rating` | `numeric(2,1)` | **Derived** — maintained by `sync_product_rating()` |
| `review_count` | `integer` | **Derived** — same trigger |
| `badge` | `text` | `New`, `Hot`, `Sale`, or null |
| `active` | `boolean` | `false` hides it from the storefront without deleting |

`rating` and `review_count` are cached aggregates so the storefront's `Product`
shape needs no join on every read. Do not write them by hand; insert, update or
delete a review and the trigger recomputes them.

`id` is a slug rather than a uuid so product URLs are readable
(`/product/lv-speedy-bag`) and the seed file is diff-friendly.

### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | `KM-XXXXX`, from `createOrderId()` |
| `user_id` | `uuid` | FK → `auth.users`, `on delete set null`. **Nullable** |
| `customer_name`, `phone`, `drop_point` | `text` | Required |
| `campus`, `notes` | `text` | |
| `payment_method` | `payment_method` | |
| `subtotal`, `delivery_fee`, `total` | `numeric(10,2)` | Computed server-side only |
| `status` | `order_status` | Fulfilment |
| `payment_status` | `payment_status` | Payment |
| `source` | `order_source` | `admin_direct` for road sales |
| `mpesa_checkout_request_id` | `text` | **Unique** where not null |
| `mpesa_merchant_request_id` | `text` | |
| `mpesa_receipt_number` | `text` | Safaricom receipt, on success |
| `mpesa_result_desc` | `text` | Success message or failure reason |
| `mpesa_phone` | `text` | Normalised `2547…` |
| `points_awarded` | `boolean` | Idempotency flag |
| `points_earned` | `integer` | |

`user_id` is nullable so guest and admin-created orders both work. EzyBite used
the sentinel strings `'guest'` and `'admin-direct'` in a `userId` field; a real
`NULL` plus the `source` column expresses the same thing without magic values.

`mpesa_checkout_request_id` carries a **unique partial index**. The callback
looks an order up by this value, so a duplicate would make the lookup
ambiguous and could mark the wrong order paid.

### `order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `order_id` | `text` | FK → `orders`, `on delete cascade` |
| `product_id` | `text` | FK → `products`, `on delete set null` |
| `name`, `price`, `quantity`, `variant`, `image`, `category` | | Denormalised |

Line details are copied rather than referenced. An order must remain an accurate
receipt after the product is renamed, repriced or deleted — `on delete set null`
on `product_id` keeps the line readable when the product is gone.

### `salon_services` / `salon_bookings`

`salon_services` is seeded from `lib/salon.ts`. `salon_bookings` replaces
EzyBite's `customOrders` collection.

Bookings carry `service_name` denormalised for the same receipt reason as
`order_items`.

### `reviews`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | `on delete set null` |
| `product_id` | `text` | `on delete cascade` |
| `author_name` | `text` | Stored so the name survives account deletion |
| `rating` | `integer` | `check between 1 and 5` |
| `body` | `text` | |

A **unique partial index** on `(user_id, product_id)` allows one review per
customer per product. EzyBite permitted anonymous reviews; insert now requires
authentication so ratings cannot be trivially inflated.

### `deals` / `updates`

Content tables: public read, admin write. `deals` has a
`check (ends_at > starts_at)` constraint.

## Functions

| Function | Purpose |
|---|---|
| `handle_new_user()` | Trigger on `auth.users` insert → creates `profiles` row, pulling name/avatar from OAuth metadata |
| `touch_updated_at()` | Maintains `updated_at` without trusting the client |
| `is_admin()` | `SECURITY DEFINER`, used by every admin policy |
| `sync_product_rating()` | Recomputes `products.rating` / `review_count` |
| `award_loyalty_points(order_id)` | Idempotent points award |
| `redeem_loyalty_points(points)` | Atomic balance check and decrement |
| `cancel_order(order_id)` | Owner-only, unpaid-only, within 5 minutes |

`is_admin()` is `SECURITY DEFINER` with a pinned `search_path` so it can read
`profiles` without recursing through that table's own RLS policies — a policy
that queried `profiles` directly would deadlock against itself.

### Why points logic lives in SQL

EzyBite awarded points from the browser (`fb_awardBitePoints`), relying on a
`pointsAwarded` flag for idempotency. That is a read-then-write race: two
concurrent callbacks could both read `false` and both award.

`award_loyalty_points()` takes `FOR UPDATE` on the order row, so a duplicate
M-Pesa callback cannot double-award. `redeem_loyalty_points()` performs the
check and the decrement in one statement:

```sql
update profiles
set loyalty_points = loyalty_points - p_points
where id = auth.uid() and loyalty_points >= p_points
returning loyalty_points into remaining;
if not found then raise exception 'Not enough points.'; end if;
```

**Points tiers** were rescaled for fashion prices. EzyBite used snack prices
(<50 / 50–199 / 200+ KES → 1 / 5 / 20 points). Kelmon uses <1,000 / 1,000–4,999
/ 5,000+ KES → 5 / 20 / 50 points.

## Storage

One public bucket, `product-images`: public read, admin-only write. Paths are
`<product-slug>/<timestamp>-<random>.<ext>`.

---

## Migrations

```
supabase/
  migrations/0001_init.sql   schema, functions, triggers, RLS, storage bucket
  seed.sql                   sample catalogue + first admin grant
```

### Applying

**Dashboard** — paste `0001_init.sql` into the SQL Editor and run, then `seed.sql`.

**CLI**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

**Local stack**

```bash
npx supabase start
npx supabase db reset   # applies migrations, then seed.sql
```

`db reset` **drops and recreates** the database. Never point it at production.

### Writing a new migration

Name files `NNNN_short_description.sql`, sequentially. Migrations are
**append-only** — never edit an applied file, because environments that already ran
it will not re-run it and will silently diverge.

- [ ] `alter table … enable row level security` on every new table. Without it,
      the anon key can read everything.
- [ ] Policies for each access pattern. No policy means no access — the safe
      default, but it breaks the feature, so be explicit.
- [ ] `create trigger … execute function touch_updated_at()` if the table has
      `updated_at`.
- [ ] Update `lib/supabase/types.ts` to match.
- [ ] `npm run typecheck` — the hand-written types are how schema drift is caught.
- [ ] Update this document.

### The TypeScript mirror

`lib/supabase/types.ts` is hand-written and must be kept in step. Two traps, both
of which cause **every query on the table to infer as `never`** rather than a clear
error:

**1. Row types must be `type` aliases, not `interface`s.**

```ts
export type ProductRow = { id: string; /* … */ };   // correct
export interface ProductRow { id: string; }         // breaks inference
```

`postgrest-js` constrains rows to `Record<string, unknown>`. TypeScript gives object
*type aliases* an implicit index signature but does not give one to interfaces, so
an interface is not assignable.

**2. `Relationships` must declare foreign keys used by embedded selects.**

`select("*, order_items(*)")` needs the relationship present in the type, or the
embed resolves to a `SelectQueryError`:

```ts
type OrderItemsRelationships = [
  {
    foreignKeyName: "order_items_order_id_fkey";
    columns: ["order_id"];
    isOneToOne: false;
    referencedRelation: "orders";
    referencedColumns: ["id"];
  },
];
```

An empty `Relationships: []` is fine for tables with no embeds.

**Generating instead** avoids both traps:

```bash
npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
```

The file is hand-written here only so the repo typechecks without network access.

### Version compatibility

`@supabase/ssr` must match the installed `@supabase/supabase-js`. Version 0.5.x
imports `GenericSchema` from a deep path
(`@supabase/supabase-js/dist/module/lib/types`) that no longer exists in
supabase-js 2.117+. The symptom is identical to trap 1 — every query types as
`never`, with nothing pointing at the version mismatch.

Check the deep path exists before debugging your own types:

```bash
test -e node_modules/@supabase/supabase-js/dist/module/lib/types.d.ts \
  && echo present || echo "missing — upgrade @supabase/ssr"
```

---

## See also

- [security.md](security.md#row-level-security) — who can read and write each table
- [architecture.md](architecture.md#2-single-store-catalogue-not-multi-vendor) — why single-store, and the migration path to multi-vendor
