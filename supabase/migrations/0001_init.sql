-- ============================================================================
-- Kelmon Fashion — initial schema
--
-- Ported from the EzyBite Firestore backend (js/firebase-service.js) and
-- adapted from food delivery to campus fashion + salon retail.
--
-- Collection -> table mapping:
--   users        -> profiles          (bitePoints -> loyalty_points)
--   orders       -> orders + order_items  (line items normalised out)
--   customOrders -> salon_bookings    (custom request -> service booking)
--   deals        -> deals
--   reviews      -> reviews           (+ optional product_id)
--   updates      -> updates
--   (new)        -> products, salon_services
--
-- Single-store model: Kelmon owns all inventory. No vendor/seller column.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────

create type user_role as enum ('customer', 'admin');

-- Union of EzyBite's status strings and Kelmon's OrderStatus (lib/orders.ts)
create type order_status as enum (
  'pending',
  'awaiting_mpesa',
  'confirmed',
  'packed',
  'delivered',
  'cancelled'
);

create type payment_status as enum (
  'unpaid',
  'initiated',
  'paid',
  'failed'
);

create type payment_method as enum ('mpesa', 'cod');

create type order_source as enum ('storefront', 'admin_direct');

create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

-- ── profiles ────────────────────────────────────────────────────────────────
-- One row per auth.users row, created automatically by the trigger below.

create table profiles (
  id             uuid primary key references auth.users on delete cascade,
  email          text,
  full_name      text,
  phone          text,
  campus         text,
  avatar_url     text,
  role           user_role   not null default 'customer',
  loyalty_points integer     not null default 0 check (loyalty_points >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column profiles.loyalty_points is
  'Kelmon Points. EzyBite''s bitePoints, rescaled for fashion price points in award_loyalty_points().';

-- ── products ────────────────────────────────────────────────────────────────
-- New table: EzyBite had no products collection (hardcoded menu).
-- Seeded from Kelmon''s lib/products.ts via supabase/seed.sql.

create table products (
  id             text primary key,               -- slug, e.g. 'lv-speedy-bag'
  name           text        not null,
  description    text,
  price          numeric(10,2) not null check (price >= 0),
  original_price numeric(10,2) check (original_price >= price),
  category       text        not null,
  images         text[]      not null default '{}',
  sizes          text[]      not null default '{}',
  colors         text[]      not null default '{}',
  stock          integer     not null default 0 check (stock >= 0),
  rating         numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count   integer     not null default 0 check (review_count >= 0),
  badge          text,                            -- 'New' | 'Hot' | 'Sale' | null
  active         boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index products_category_idx on products (category) where active;
create index products_active_created_idx on products (created_at desc) where active;

-- ── orders ──────────────────────────────────────────────────────────────────
-- id keeps Kelmon''s human-readable format from createOrderId(): 'KM-XXXXX'.
-- user_id is nullable so guest and admin-direct (road sale) orders both work,
-- matching EzyBite''s userId='guest' / 'admin-direct' sentinels.

create table orders (
  id             text primary key,
  user_id        uuid references auth.users on delete set null,
  customer_name  text        not null,
  phone          text        not null,
  drop_point     text        not null,
  campus         text,
  notes          text,
  payment_method payment_method not null default 'mpesa',
  subtotal       numeric(10,2) not null check (subtotal >= 0),
  delivery_fee   numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total          numeric(10,2) not null check (total >= 0),
  status         order_status   not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  source         order_source   not null default 'storefront',

  -- M-Pesa STK push tracking (api/stkpush.js + api/callback.js)
  mpesa_checkout_request_id text,
  mpesa_merchant_request_id text,
  mpesa_receipt_number      text,
  mpesa_result_desc         text,
  mpesa_phone               text,

  -- Loyalty award idempotency (EzyBite pointsAwarded / pointsEarned)
  points_awarded boolean     not null default false,
  points_earned  integer     not null default 0,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index orders_user_created_idx on orders (user_id, created_at desc);
create index orders_created_idx on orders (created_at desc);
create index orders_status_idx on orders (status);
create index orders_payment_status_idx on orders (payment_status);
-- Callback lookup by CheckoutRequestID must be fast and unique
create unique index orders_mpesa_checkout_idx
  on orders (mpesa_checkout_request_id)
  where mpesa_checkout_request_id is not null;

-- ── order_items ─────────────────────────────────────────────────────────────
-- Denormalised name/price/image so an order is a faithful receipt even after
-- the product is edited or deleted.

create table order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   text not null references orders on delete cascade,
  product_id text references products on delete set null,
  name       text not null,
  price      numeric(10,2) not null check (price >= 0),
  quantity   integer not null check (quantity > 0),
  variant    text,                                -- size / color chosen
  image      text,
  category   text
);

create index order_items_order_idx on order_items (order_id);

-- ── salon_services ──────────────────────────────────────────────────────────
-- Seeded from lib/salon.ts.

create table salon_services (
  id          text primary key,
  name        text not null,
  description text,
  price       numeric(10,2) not null check (price >= 0),
  duration    text,                                -- e.g. '45 min'
  icon        text,
  image       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── salon_bookings ──────────────────────────────────────────────────────────
-- Replaces EzyBite''s customOrders collection.

create table salon_bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete set null,
  service_id   text references salon_services on delete set null,
  service_name text not null,
  customer_name text not null,
  phone        text not null,
  scheduled_for timestamptz,
  notes        text,
  total        numeric(10,2) not null default 0 check (total >= 0),
  status       booking_status not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index salon_bookings_user_idx on salon_bookings (user_id, created_at desc);

-- ── reviews ─────────────────────────────────────────────────────────────────
-- EzyBite allowed guest reviews. Here insert requires auth so ratings can''t be
-- botted, but author_name is stored so the display name survives account
-- deletion.

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete set null,
  product_id  text references products on delete cascade,
  author_name text not null,
  rating      integer not null check (rating between 1 and 5),
  body        text,
  created_at  timestamptz not null default now()
);

create index reviews_product_idx on reviews (product_id, created_at desc);
create index reviews_created_idx on reviews (created_at desc);
-- One review per user per product
create unique index reviews_user_product_idx
  on reviews (user_id, product_id)
  where user_id is not null and product_id is not null;

-- ── deals ───────────────────────────────────────────────────────────────────

create table deals (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  image            text,
  code             text,
  discount_percent integer check (discount_percent between 1 and 100),
  starts_at        timestamptz,
  ends_at          timestamptz,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint deals_window_valid check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index deals_created_idx on deals (created_at desc);

-- ── updates ─────────────────────────────────────────────────────────────────

create table updates (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  tag        text,
  created_at timestamptz not null default now()
);

create index updates_created_idx on updates (created_at desc);

-- ============================================================================
-- Triggers and functions
-- ============================================================================

-- Keep updated_at honest without trusting the client.
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch       before update on profiles       for each row execute function touch_updated_at();
create trigger products_touch       before update on products       for each row execute function touch_updated_at();
create trigger orders_touch         before update on orders         for each row execute function touch_updated_at();
create trigger salon_bookings_touch before update on salon_bookings for each row execute function touch_updated_at();

-- Auto-create a profile on signup. Pulls name/avatar from the Google OAuth
-- payload so the first Google sign-in lands a populated profile — this replaces
-- the manual setDoc(users/uid) in fb_signUp and fb_signInWithGoogle.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Role check used by every admin policy below.
-- SECURITY DEFINER + a dedicated search_path so the function can read profiles
-- without recursing through profiles' own RLS policies.
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

-- Recompute a product's cached rating/review_count. Keeps the storefront's
-- Product shape (rating, reviewCount) correct without a join on every read.
create or replace function sync_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := coalesce(new.product_id, old.product_id);
begin
  if target is null then
    return coalesce(new, old);
  end if;

  update public.products p
  set rating = coalesce(agg.avg_rating, 0),
      review_count = coalesce(agg.n, 0)
  from (
    select round(avg(rating)::numeric, 1) as avg_rating, count(*) as n
    from public.reviews where product_id = target
  ) agg
  where p.id = target;

  return coalesce(new, old);
end;
$$;

create trigger reviews_sync_product_rating
  after insert or update or delete on reviews
  for each row execute function sync_product_rating();

-- Award loyalty points for a paid order. Idempotent, and server-side so a
-- client can't mint points — EzyBite's fb_awardBitePoints did this from the
-- browser, which was only safe because of the pointsAwarded flag.
--
-- Tiers rescaled from EzyBite's snack prices (<50 / 50-199 / 200+ KES) to
-- Kelmon's fashion price points.
create or replace function award_loyalty_points(p_order_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  o    orders;
  pts  integer;
begin
  select * into o from orders where id = p_order_id for update;

  if not found or o.points_awarded or o.user_id is null then
    return 0;
  end if;

  if o.payment_status <> 'paid' then
    return 0;
  end if;

  pts := case
    when o.total >= 5000 then 50
    when o.total >= 1000 then 20
    else 5
  end;

  update orders
  set points_awarded = true, points_earned = pts
  where id = p_order_id;

  update profiles
  set loyalty_points = loyalty_points + pts
  where id = o.user_id;

  return pts;
end;
$$;

-- Redeem points. Ported from fb_redeemBitePoints, but the balance check and
-- decrement now happen in one transaction instead of a read-then-write race.
create or replace function redeem_loyalty_points(p_points integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if p_points is null or p_points <= 0 then
    raise exception 'Points to redeem must be positive.';
  end if;

  update profiles
  set loyalty_points = loyalty_points - p_points
  where id = auth.uid() and loyalty_points >= p_points
  returning loyalty_points into remaining;

  if not found then
    raise exception 'Not enough points.';
  end if;

  return remaining;
end;
$$;

-- Cancel an order: owner only, unpaid only, within 5 minutes.
-- Ported from fb_cancelOrder. EzyBite hard-deleted; we keep the row and set
-- status='cancelled' so admin stats stay accurate.
create or replace function cancel_order(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders;
begin
  select * into o from orders where id = p_order_id for update;

  if not found then
    raise exception 'Order not found.';
  end if;
  if o.user_id is distinct from auth.uid() then
    raise exception 'Unauthorized.';
  end if;
  if o.payment_status = 'paid' then
    raise exception 'Paid orders cannot be cancelled.';
  end if;
  if now() - o.created_at > interval '5 minutes' then
    raise exception 'Cancellation window expired (5 minutes).';
  end if;

  update orders set status = 'cancelled' where id = p_order_id;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table profiles       enable row level security;
alter table products       enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;
alter table salon_services enable row level security;
alter table salon_bookings enable row level security;
alter table reviews        enable row level security;
alter table deals          enable row level security;
alter table updates        enable row level security;

-- profiles ------------------------------------------------------------------
create policy "profiles: read own" on profiles
  for select using (id = auth.uid());

create policy "profiles: admin reads all" on profiles
  for select using (is_admin());

-- Column-level guard: role and loyalty_points are not client-writable.
-- The WITH CHECK re-reads the stored row, so a self-promotion attempt fails.
create policy "profiles: update own" on profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid())
    and loyalty_points = (select loyalty_points from profiles where id = auth.uid())
  );

create policy "profiles: admin writes all" on profiles
  for all using (is_admin()) with check (is_admin());

-- products ------------------------------------------------------------------
create policy "products: public reads active" on products
  for select using (active or is_admin());

create policy "products: admin writes" on products
  for all using (is_admin()) with check (is_admin());

-- orders --------------------------------------------------------------------
create policy "orders: read own" on orders
  for select using (user_id = auth.uid());

create policy "orders: create own" on orders
  for insert with check (
    user_id = auth.uid()
    -- A client may only open an order as unpaid/pending. Promotion to 'paid'
    -- happens in the M-Pesa callback via the service-role key.
    and status = 'pending'
    and payment_status = 'unpaid'
    and source = 'storefront'
    and points_awarded = false
  );

create policy "orders: admin full access" on orders
  for all using (is_admin()) with check (is_admin());

-- order_items ---------------------------------------------------------------
create policy "order_items: read own" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "order_items: create for own order" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "order_items: admin full access" on order_items
  for all using (is_admin()) with check (is_admin());

-- salon_services ------------------------------------------------------------
create policy "salon_services: public reads active" on salon_services
  for select using (active or is_admin());

create policy "salon_services: admin writes" on salon_services
  for all using (is_admin()) with check (is_admin());

-- salon_bookings ------------------------------------------------------------
create policy "salon_bookings: read own" on salon_bookings
  for select using (user_id = auth.uid());

create policy "salon_bookings: create own" on salon_bookings
  for insert with check (user_id = auth.uid() and status = 'pending');

create policy "salon_bookings: admin full access" on salon_bookings
  for all using (is_admin()) with check (is_admin());

-- reviews -------------------------------------------------------------------
create policy "reviews: public read" on reviews
  for select using (true);

create policy "reviews: create own" on reviews
  for insert with check (user_id = auth.uid());

create policy "reviews: update own" on reviews
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reviews: delete own" on reviews
  for delete using (user_id = auth.uid());

create policy "reviews: admin full access" on reviews
  for all using (is_admin()) with check (is_admin());

-- deals ---------------------------------------------------------------------
create policy "deals: public reads active" on deals
  for select using (active or is_admin());

create policy "deals: admin writes" on deals
  for all using (is_admin()) with check (is_admin());

-- updates -------------------------------------------------------------------
create policy "updates: public read" on updates
  for select using (true);

create policy "updates: admin writes" on updates
  for all using (is_admin()) with check (is_admin());

-- ============================================================================
-- Storage: product and deal imagery
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product-images: public read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product-images: admin write" on storage.objects
  for insert with check (bucket_id = 'product-images' and is_admin());

create policy "product-images: admin update" on storage.objects
  for update using (bucket_id = 'product-images' and is_admin());

create policy "product-images: admin delete" on storage.objects
  for delete using (bucket_id = 'product-images' and is_admin());
