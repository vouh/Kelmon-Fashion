# Data Model

Every table, column, relationship, constraint, index, function and trigger, with
the reasoning wherever a choice is not obvious.

**Current as of:** 2026-09-28.

**Source of truth:** [`prisma/schema.prisma`](../prisma/schema.prisma) for tables
and columns; [`prisma/migrations/20260928120000_init/migration.sql`](../prisma/migrations/20260928120000_init/migration.sql)
for everything Prisma cannot express.

**TypeScript mirrors:** [`lib/supabase/types.ts`](../lib/supabase/types.ts) (row
types for supabase-js) and [`lib/validation/schemas.ts`](../lib/validation/schemas.ts)
(Zod schemas for untrusted input).

**Access rules:** [security.md](security.md#row-level-security).

---

## Contents

- [Who owns what](#who-owns-what)
- [Entity relationships](#entity-relationships)
- [Enums](#enums)
- [Tables](#tables)
- [Indexes](#indexes)
- [Constraints](#constraints)
- [Functions](#functions)
- [Triggers](#triggers)
- [Storage](#storage)
- [Migrations](#migrations)
- [The TypeScript mirrors](#the-typescript-mirrors)

---

## Who owns what

Three tools touch this data model, and the split between them is deliberate.

| Tool | Owns | Does not |
|---|---|---|
| **Prisma** | The schema and migrations | Run at runtime — there is no Prisma Client in this project |
| **supabase-js** | Every runtime read and write | Define schema |
| **Zod** | Validating untrusted input at boundaries | Authorise anything |

**Why Prisma does not do data access.** Prisma connects straight to Postgres over
a connection string, so it runs as the database owner and RLS does not apply to it
— `app_uid()` returns null for every Prisma query. The Supabase anon key ships to
the browser, so RLS is the only thing between a visitor and this data. Moving
reads onto Prisma would move authorisation into app code, where one missing
`where` clause is a leak. There is deliberately no `@prisma/client` dependency and
no generator block in the schema.

The two server paths that legitimately bypass RLS — the M-Pesa callback and
profile creation at sign-in — use `createServiceClient()` in
[`lib/supabase/server.ts`](../lib/supabase/server.ts).

**Why Zod is not authorisation.** A passing schema means "well-formed", never
"allowed". Validation produces one clear 400 naming the bad field instead of a 500
from deeper in, and normalises phone numbers; it decides nothing about who may act.

---

## Entity relationships

```
Firebase Auth (external)
      │  UID
      ▼
   profiles ──────┬───────────────┐
      │           │               │
      │ 1:N       │ 1:N           │
      ▼           ▼               │
   orders      reviews            │
      │           │               │
      │ 1:N       │ N:1           │
      ▼           ▼               ▼
 order_items ──N:1──────────── products

 deals      (standalone content)
 updates    (standalone content)
```

`profiles` is the user table. There is no `auth.users` row behind it — accounts
live in Firebase, and **`profiles.id` is the Firebase UID**. The row is created by
[`app/api/auth/session/route.ts`](../app/api/auth/session/route.ts) on first
sign-in, with the service role.

| Relationship | FK | On delete | Why |
|---|---|---|---|
| `orders.user_id` → `profiles.id` | `orders_user_id_fkey` | `SET NULL` | An order stays a valid receipt after the account is gone |
| `reviews.user_id` → `profiles.id` | `reviews_user_id_fkey` | `SET NULL` | The review keeps its `author_name` byline |
| `reviews.product_id` → `products.id` | `reviews_product_id_fkey` | `CASCADE` | A review of a deleted product has no meaning |
| `order_items.order_id` → `orders.id` | `order_items_order_id_fkey` | `CASCADE` | Line items have no life without their order |
| `order_items.product_id` → `products.id` | `order_items_product_id_fkey` | `SET NULL` | The line stays readable from its copied columns |

---

## Enums

| Type | Values |
|---|---|
| `user_role` | `customer`, `admin` |
| `order_status` | `pending`, `awaiting_mpesa`, `confirmed`, `packed`, `delivered`, `cancelled` |
| `payment_status` | `unpaid`, `initiated`, `paid`, `failed` |
| `payment_method` | `mpesa`, `cod` |
| `order_source` | `storefront`, `admin_direct` |

**Fulfilment and payment are separate columns on purpose.** An order can be
`delivered` + `unpaid` (cash on delivery not yet collected), or `pending` + `paid`.
Collapsing them into one status column — the original design this was ported from
— could not express either combination.

---

## Tables

### `profiles`

One row per Firebase user.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `text` | no | — | **PK.** The Firebase UID, a 28-character string. No FK: the account lives in Firebase |
| `email` | `text` | yes | — | Refreshed from the ID token on each sign-in. Not user-editable |
| `full_name` | `text` | yes | — | Seeded from the token's `name` claim, then the user's own |
| `phone` | `text` | yes | — | User-editable |
| `campus` | `text` | yes | — | User-editable. Shown as "Campus / location" |
| `avatar_url` | `text` | yes | — | An uploaded URL or a preset from `lib/avatars.ts` — indistinguishable downstream |
| `role` | `user_role` | no | `customer` | **Not client-writable** |
| `loyalty_points` | `integer` | no | `0` | **Not client-writable.** Kelmon Points |
| `created_at` | `timestamptz(6)` | no | `now()` | |
| `updated_at` | `timestamptz(6)` | no | `now()` | Maintained by `touch_updated_at()` |

`role` and `loyalty_points` are guarded by the `guard_profile_columns()` trigger,
which **raises** if a client changes either. A trigger rather than an RLS `WITH
CHECK` for two reasons: it also covers writes arriving through the admin policy,
and it fails loudly instead of letting a rejected write look like a no-op.

There is no client insert policy — rows come from `/api/auth/session`.

### `products`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `text` | no | — | **PK.** A slug, e.g. `lv-speedy-bag` |
| `name` | `text` | no | — | |
| `description` | `text` | yes | — | |
| `price` | `numeric(10,2)` | no | — | `>= 0` |
| `original_price` | `numeric(10,2)` | yes | — | `>= price` — a "was" price must exceed the current one |
| `category` | `text` | no | — | Free text; the live list comes from `getCategories()` |
| `images` | `text[]` | no | `{}` | **First element is the card image** |
| `sizes` | `text[]` | no | `{}` | e.g. `{S,M,L}` or `{30ml,50ml,100ml}` |
| `colors` | `text[]` | no | `{}` | |
| `stock` | `integer` | no | `0` | `>= 0`. Displayed and editable, but **never decremented** — see [security.md](security.md#known-issues-and-accepted-risks) |
| `rating` | `numeric(2,1)` | no | `0` | **Derived.** `sync_product_rating()` |
| `review_count` | `integer` | no | `0` | **Derived.** Same trigger |
| `badge` | `text` | yes | — | `New`, `Hot`, `Sale`, or null |
| `active` | `boolean` | no | `true` | `false` hides it from the storefront without deleting |
| `created_at` | `timestamptz(6)` | no | `now()` | |
| `updated_at` | `timestamptz(6)` | no | `now()` | Maintained by `touch_updated_at()` |

`id` is a slug rather than a uuid so product URLs read well
(`/product/lv-speedy-bag`). The Zod `productSlugSchema` constrains it to
lowercase, digits and single hyphens, because it is also a URL segment.

`rating` and `review_count` are cached aggregates, so the storefront's `Product`
shape needs no join on every read. **Do not write them by hand** — insert, update
or delete a review and the trigger recomputes both.

The three array columns are `NOT NULL DEFAULT '{}'`. Prisma emits no `NOT NULL`
for scalar lists, so the migration adds it: one empty case to handle instead of
two.

### `orders`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `text` | no | — | **PK.** `KM-XXXXX`, from `createOrderId()` |
| `user_id` | `text` | yes | — | FK → `profiles`. **Nullable** for guest and admin-direct orders |
| `customer_name` | `text` | no | — | |
| `phone` | `text` | no | — | Normalised to `2547…` by Zod before it lands |
| `drop_point` | `text` | no | — | Campus delivery point |
| `campus` | `text` | yes | — | |
| `notes` | `text` | yes | — | |
| `payment_method` | `payment_method` | no | `mpesa` | |
| `subtotal` | `numeric(10,2)` | no | — | `>= 0`. **Computed server-side only** |
| `delivery_fee` | `numeric(10,2)` | no | `0` | `>= 0`. From `deliveryFeeFor()` |
| `total` | `numeric(10,2)` | no | — | `>= 0`. **Computed server-side only** |
| `status` | `order_status` | no | `pending` | Fulfilment |
| `payment_status` | `payment_status` | no | `unpaid` | Payment |
| `source` | `order_source` | no | `storefront` | `admin_direct` for road sales |
| `mpesa_checkout_request_id` | `text` | yes | — | **Unique where not null** |
| `mpesa_merchant_request_id` | `text` | yes | — | |
| `mpesa_receipt_number` | `text` | yes | — | Safaricom receipt, on success |
| `mpesa_result_desc` | `text` | yes | — | Success message or failure reason |
| `mpesa_phone` | `text` | yes | — | The number actually charged |
| `points_awarded` | `boolean` | no | `false` | Idempotency flag |
| `points_earned` | `integer` | no | `0` | |
| `created_at` | `timestamptz(6)` | no | `now()` | Also the cancellation-window clock |
| `updated_at` | `timestamptz(6)` | no | `now()` | Maintained by `touch_updated_at()` |

`user_id` is nullable so guest and admin-created orders both work. The original
design used the sentinel strings `'guest'` and `'admin-direct'` in a `userId`
field; a real `NULL` plus the `source` column says the same thing without magic
values.

`mpesa_checkout_request_id` carries a **unique partial index**. The callback looks
an order up by this value, so a duplicate would make the lookup ambiguous and
could mark the wrong order paid. That is correctness, not performance.

There is deliberately **no customer update policy**. Customers change an order
through `cancel_order()`, which enforces owner-only, unpaid-only, within five
minutes. A general update policy would let a customer set their own
`payment_status`.

### `order_items`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | **PK** |
| `order_id` | `text` | no | — | FK → `orders`, `CASCADE` |
| `product_id` | `text` | yes | — | FK → `products`, `SET NULL` |
| `name` | `text` | no | — | Denormalised |
| `price` | `numeric(10,2)` | no | — | `>= 0`. Denormalised |
| `quantity` | `integer` | no | — | `> 0` |
| `variant` | `text` | yes | — | Size or colour chosen |
| `image` | `text` | yes | — | Denormalised |
| `category` | `text` | yes | — | Denormalised |

Line details are **copied, not referenced**. An order must remain an accurate
receipt after the product is renamed, repriced or deleted — and `SET NULL` on
`product_id` keeps the line readable once the product is gone.

### `reviews`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | **PK** |
| `user_id` | `text` | yes | — | FK → `profiles`, `SET NULL` |
| `product_id` | `text` | yes | — | FK → `products`, `CASCADE` |
| `author_name` | `text` | no | — | Stored so the byline survives account deletion |
| `rating` | `integer` | no | — | `between 1 and 5` |
| `body` | `text` | yes | — | |
| `created_at` | `timestamptz(6)` | no | `now()` | |

A **unique partial index** on `(user_id, product_id)` allows one review per
customer per product. Partial, because NULL here means "guest" or "detached", not
"same key". Insert requires authentication, so ratings cannot be padded
anonymously.

### `deals`

Content table: public read of active rows, admin write.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | **PK** |
| `title` | `text` | no | — | |
| `description` | `text` | yes | — | |
| `image` | `text` | yes | — | URL, usually in the `deal-images` bucket |
| `code` | `text` | yes | — | Promo code. **Not redeemed anywhere yet** — display only |
| `discount_percent` | `integer` | yes | — | `between 1 and 100` |
| `starts_at` | `timestamptz(6)` | yes | — | |
| `ends_at` | `timestamptz(6)` | yes | — | Must be after `starts_at` |
| `active` | `boolean` | no | `true` | |
| `created_at` | `timestamptz(6)` | no | `now()` | |

`active` gates visibility; `starts_at` / `ends_at` are **not** enforced by any
query yet, so an expired deal stays visible until `active` is cleared.

### `updates`

Content table: public read, admin write. Announcements on the storefront.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | **PK** |
| `title` | `text` | no | — | |
| `body` | `text` | no | — | |
| `tag` | `text` | yes | — | Free-text label, e.g. `Restock` |
| `created_at` | `timestamptz(6)` | no | `now()` | |

---

## Indexes

Beyond the primary keys:

| Index | Table | Definition | Purpose |
|---|---|---|---|
| `products_category_idx` | `products` | `(category) WHERE active` | Category filter. Partial — the storefront only queries active rows |
| `products_active_created_idx` | `products` | `(created_at DESC) WHERE active` | Newest-first listing |
| `orders_user_created_idx` | `orders` | `(user_id, created_at DESC)` | A customer's order history |
| `orders_created_idx` | `orders` | `(created_at DESC)` | Admin order list |
| `orders_status_idx` | `orders` | `(status)` | Fulfilment queue |
| `orders_payment_status_idx` | `orders` | `(payment_status)` | Payment ledgers |
| `orders_mpesa_checkout_idx` | `orders` | **UNIQUE** `(mpesa_checkout_request_id) WHERE NOT NULL` | **Correctness** — callback lookup must be unambiguous |
| `order_items_order_idx` | `order_items` | `(order_id)` | The `order_items(*)` embed |
| `reviews_product_idx` | `reviews` | `(product_id, created_at DESC)` | Reviews on a product page |
| `reviews_created_idx` | `reviews` | `(created_at DESC)` | Admin moderation list |
| `reviews_user_product_idx` | `reviews` | **UNIQUE** `(user_id, product_id) WHERE both NOT NULL` | **Correctness** — one review per customer per product |
| `deals_created_idx` | `deals` | `(created_at DESC)` | |
| `updates_created_idx` | `updates` | `(created_at DESC)` | |

Prisma cannot put a `WHERE` clause on an index, so the four partial ones are raw
SQL in the migration.

---

## Constraints

Prisma has no syntax for `CHECK`, so these are all raw SQL — and they are the
difference between a schema that documents intent and one that enforces it.

| Constraint | Rule |
|---|---|
| `profiles_loyalty_points_non_negative` | `loyalty_points >= 0` |
| `products_price_non_negative` | `price >= 0` |
| `products_original_price_higher` | `original_price IS NULL OR original_price >= price` |
| `products_stock_non_negative` | `stock >= 0` |
| `products_rating_range` | `rating BETWEEN 0 AND 5` |
| `products_review_count_non_negative` | `review_count >= 0` |
| `orders_subtotal_non_negative` | `subtotal >= 0` |
| `orders_delivery_fee_non_negative` | `delivery_fee >= 0` |
| `orders_total_non_negative` | `total >= 0` |
| `order_items_price_non_negative` | `price >= 0` |
| `order_items_quantity_positive` | `quantity > 0` |
| `reviews_rating_range` | `rating BETWEEN 1 AND 5` |
| `deals_discount_percent_range` | `discount_percent IS NULL OR BETWEEN 1 AND 100` |
| `deals_window_valid` | `ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at` |

Two of these are mirrored in Zod (`products_original_price_higher`,
`deals_window_valid`) so the user sees "Original price must be higher than the
sale price" rather than a constraint name. The database check remains the
guarantee; the Zod one is the message.

---

## Functions

| Function | Returns | Security | Purpose |
|---|---|---|---|
| `app_uid()` | `text` | invoker | The caller's Firebase UID, from the JWT `sub` claim. Replaces `auth.uid()` |
| `app_is_admin_claim()` | `boolean` | invoker | Reads the `admin` custom claim from the JWT |
| `app_is_service()` | `boolean` | invoker | True for `service_role` / `postgres` / `supabase_admin` |
| `is_admin()` | `boolean` | **definer** | Claim first, `profiles.role` second. Used by every admin policy |
| `touch_updated_at()` | trigger | invoker | Maintains `updated_at` without trusting the client |
| `guard_profile_columns()` | trigger | **invoker** | Raises if a client changes `role` or `loyalty_points` |
| `sync_product_rating()` | trigger | **definer** | Recomputes `products.rating` / `review_count` |
| `award_loyalty_points(text)` | `integer` | **definer** | Idempotent points award |
| `redeem_loyalty_points(int)` | `integer` | **definer** | Atomic balance check and decrement |
| `cancel_order(text)` | `void` | **definer** | Owner-only, unpaid-only, within 5 minutes |

### Why `app_uid()` instead of `auth.uid()`

`auth.uid()` casts the `sub` claim to `uuid`, and a Firebase UID is a
28-character string. Every policy uses `app_uid()`, which returns `text`.

It returns `null` for an unauthenticated request, and `column = null` is never
true — so an anonymous caller matches no owner row. That is the right failure
direction.

### Why `is_admin()` is `SECURITY DEFINER`

It reads `profiles`, and `profiles` has RLS policies that call `is_admin()`.
Without `DEFINER`, evaluating one would recurse into the other. The pinned
`search_path = public` stops a caller shadowing `profiles` from a schema earlier
in their own path.

### Why `guard_profile_columns()` is deliberately **not** `SECURITY DEFINER`

It calls `app_is_service()`, which compares `current_user`. Inside a `SECURITY
DEFINER` function `current_user` is the function's *owner*, not the caller — so
the guard would pass for everyone. This one subtlety silently disables the whole
protection, which is why it is called out here and in the migration.

### Why the points logic lives in SQL

The original awarded points from the browser, relying on a `pointsAwarded` flag
for idempotency. That is a read-then-write race: two concurrent callbacks could
both read `false` and both award.

`award_loyalty_points()` takes `FOR UPDATE` on the order row, so a duplicate
M-Pesa callback cannot double-award. `redeem_loyalty_points()` does the check and
the decrement in one statement:

```sql
update profiles
set loyalty_points = loyalty_points - p_points
where id = app_uid() and loyalty_points >= p_points
returning loyalty_points into remaining;
if not found then raise exception 'Not enough points.'; end if;
```

**Points tiers** are scaled for fashion prices, not the snack prices this was
ported from (`<50 / 50–199 / 200+ KES → 1 / 5 / 20`):

| Order total | Points |
|---|---|
| under KES 1,000 | 5 |
| KES 1,000 – 4,999 | 20 |
| KES 5,000 and over | 50 |

Awarded only when `payment_status = 'paid'`, and only once.

---

## Triggers

| Trigger | Table | When | Function |
|---|---|---|---|
| `profiles_touch` | `profiles` | BEFORE UPDATE | `touch_updated_at()` |
| `products_touch` | `products` | BEFORE UPDATE | `touch_updated_at()` |
| `orders_touch` | `orders` | BEFORE UPDATE | `touch_updated_at()` |
| `profiles_guard_columns` | `profiles` | BEFORE UPDATE | `guard_profile_columns()` |
| `reviews_sync_product_rating` | `reviews` | AFTER INSERT/UPDATE/DELETE | `sync_product_rating()` |

Both `profiles` triggers are `BEFORE UPDATE`; Postgres fires them in name order,
so `profiles_guard_columns` runs before `profiles_touch`. Neither depends on the
other.

There is **no trigger on `auth.users`**. The earlier `handle_new_user()` created a
profile on Supabase Auth signup; Firebase users never appear in that table, so it
was dropped and `/api/auth/session` does the job.

---

## Storage

Three public-read buckets. Helpers in
[`lib/supabase/storage.ts`](../lib/supabase/storage.ts); policies at the bottom of
the migration.

| Bucket | Path shape | Write | Size limit | MIME types |
|---|---|---|---|---|
| `product-images` | `<product-slug>/<timestamp>-<random>.<ext>` | `is_admin()` | 5 MB | jpeg, png, webp, avif, gif |
| `deal-images` | `<timestamp>-<random>.<ext>` | `is_admin()` | 5 MB | jpeg, png, webp, avif, gif |
| `avatars` | `<firebase-uid>/<timestamp>-<random>.<ext>` | owner only | 2 MB | jpeg, png, webp, avif |

Public read means anyone with the URL can fetch the object — which is what a
storefront product photo is for. The URL is what gets stored on the row
(`products.images`, `deals.image`, `profiles.avatar_url`), so an uploaded image
and a preset avatar URL are indistinguishable downstream.

The avatars folder must be the caller's own UID: the policy compares
`(storage.foldername(name))[1]` against `app_uid()`, so nobody can overwrite
another user's photo.

`file_size_limit` and `allowed_mime_types` mean Storage itself refuses a bad
upload. The checks in `lib/supabase/storage.ts` exist to name the offending file,
not to provide the guarantee.

Uploads go **straight from the browser to Storage** — no bytes pass through a
Next.js route — and authorisation is the same Firebase token RLS uses for tables.

---

## Migrations

```
prisma/
  schema.prisma                       tables, columns, relations, plain indexes
  migrations/
    migration_lock.toml               provider = postgresql
    20260928120000_init/migration.sql generated DDL + everything Prisma can't express
    20260928200000_protected_super_admins/migration.sql
                                      super admins that can't be deleted or demoted
prisma.config.ts                      connection URLs and dotenv loading
```

Catalogue content is entered through `/admin/products`, so an empty storefront
means an empty table.

### Applying

```bash
npm run db:status     # what has been applied
npm run db:migrate    # prisma migrate deploy
```

Both need `DIRECT_URL` (or `DATABASE_URL`) set — see
[architecture.md](architecture.md#environment-variables).

### Two connection URLs

| Variable | Port | Used by | Why |
|---|---|---|---|
| `DIRECT_URL` | 5432, direct | Migrations | They need a real session — advisory locks, DDL in a transaction — which pgbouncer's transaction pooling cannot give |
| `DATABASE_URL` | 6543, pooled | Fallback | Nothing connects directly at runtime; the app talks to Supabase over HTTP |

Prisma 7 no longer accepts `url` / `directUrl` inside `schema.prisma`, and no
longer auto-loads dotenv files. Both are handled in
[`prisma.config.ts`](../prisma.config.ts).

### Writing a new migration

The two halves of the init migration are maintained differently, and mixing them
up is the main way to break this.

**Changing a table or column** — edit `prisma/schema.prisma`, then:

```bash
npm run db:migrate:new -- --name add_thing   # prisma migrate dev --create-only
```

That writes the DDL without applying it, so you can append raw SQL before it runs.

**Adding a constraint, partial index, function, trigger, policy or bucket** —
hand-write it in the migration's SQL. Prisma cannot express any of these and will
not notice they exist.

The generated DDL in `20260928120000_init` is pasted from
`prisma migrate diff --from-empty --to-schema` (`npm run db:ddl`). **Do not
hand-edit that half** — change the schema and regenerate, or the two diverge
silently.

Checklist for a new table:

- [ ] `alter table … enable row level security`. Without it the anon key reads
      everything.
- [ ] A policy per access pattern. No policy means no access — the safe default,
      but it breaks the feature, so be explicit.
- [ ] `create trigger … execute function touch_updated_at()` if it has
      `updated_at`.
- [ ] `CHECK` constraints for anything the type system does not cover.
- [ ] Update `lib/supabase/types.ts` — hand-written, and how schema drift is caught.
- [ ] Add a Zod schema in `lib/validation/schemas.ts` if clients write to it.
- [ ] `npm run typecheck`.
- [ ] Update this document.

Migrations are **append-only**. Never edit an applied file: environments that
already ran it will not re-run it and will silently diverge.

---

## The TypeScript mirrors

### `lib/supabase/types.ts`

Hand-written, and must be kept in step with the schema. Two traps, both of which
make **every query on the table infer as `never`** rather than giving a clear
error:

**1. Row types must be `type` aliases, not `interface`s.**

```ts
export type ProductRow = { id: string; /* … */ };   // correct
export interface ProductRow { id: string; }         // breaks inference
```

`postgrest-js` constrains rows to `Record<string, unknown>`. TypeScript gives
object *type aliases* an implicit index signature but does not give one to
interfaces, so an interface is not assignable.

**2. `Relationships` must declare the foreign keys used by embedded selects.**

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

`Relationships: []` is fine for tables with no embeds.

Generating instead avoids both traps:

```bash
npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
```

The file is hand-written here only so the repo typechecks without network access.

### `lib/validation/schemas.ts`

Zod schemas for request bodies and Server Action inputs. Notable ones:

| Schema | Guards | Note |
|---|---|---|
| `sessionRequestSchema` | `POST /api/auth/session` | Shape only — three base64url segments. Signature verification is what decides trust |
| `createOrderSchema` | `POST /api/orders` | Accepts `price`/`name`/`image` then **ignores them**; the route re-reads all of it from `products` |
| `directOrderSchema` | `createDirectOrder` | Admin road sale |
| `productInputSchema` | `upsertProduct` | Slug format, image URLs, array caps, and the "was" price rule |
| `dealInputSchema` | `createDeal` | Mirrors `deals_window_valid` |
| `updateInputSchema` | `createUpdate` | |
| `phoneSchema` | both order paths | **Normalises** to `2547…`, the only form Safaricom accepts |

Server Action inputs are validated too, which is the easy one to skip — the call
looks like a function call in your editor. It isn't: a Server Action is a POST
endpoint anyone can invoke with any body.

### Why field names are snake_case everywhere

`prisma/schema.prisma` uses snake_case field names rather than Prisma's camelCase
convention, so a row looks identical whether it came from Prisma or supabase-js.
One shape to remember instead of two, and `lib/supabase/types.ts` stays a direct
mirror of the schema.

---

## See also

- [security.md](security.md#row-level-security) — who can read and write each table
- [architecture.md](architecture.md#6-firebase-auth-as-a-supabase-third-party-provider) — why Firebase issues the tokens and Supabase enforces access
