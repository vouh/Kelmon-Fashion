-- ============================================================================
-- Kelmon Fashion — Firebase Authentication as the identity provider
--
-- Authentication moves from Supabase Auth to Firebase Auth, registered in the
-- Supabase dashboard under Authentication -> Third Party Auth. Supabase keeps
-- the data, the storage buckets and the row level security; Firebase issues the
-- tokens.
--
-- What that changes in here:
--
--   * A user id is a Firebase UID — a 28-character string, not a uuid. Every
--     identity column becomes `text` and the foreign keys to `auth.users` go
--     away, because Firebase users never appear in that table.
--
--   * `auth.uid()` is unusable: it casts the `sub` claim to uuid and a Firebase
--     UID is not one. `app_uid()` replaces it and returns text.
--
--   * `is_admin()` reads the `admin` custom claim first and falls back to
--     profiles.role, so the claim is the fast path and the table is the
--     durable record. Claims are written by the Admin SDK in
--     lib/firebase/admin.ts; they can never be self-granted from a client.
--
--   * Profiles are created by app/api/auth/session/route.ts on first sign-in,
--     replacing the handle_new_user() trigger on auth.users.
--
-- Run after 0002_remove_salon.sql. Idempotent enough to re-run: every drop is
-- `if exists` and every create is `or replace`.
-- ============================================================================

-- ── Identity helpers ────────────────────────────────────────────────────────

-- The signed-in Firebase UID, or null. Reads the request's JWT claims straight
-- from the GUC rather than going through auth.jwt(), so the function does not
-- depend on the auth schema and behaves the same under psql.
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

comment on function public.app_uid() is
  'The caller''s Firebase UID from the JWT sub claim. Replaces auth.uid(), which cannot represent a non-uuid subject.';

-- The `admin` custom claim, written by the Firebase Admin SDK.
create or replace function public.app_is_admin_claim()
returns boolean
language sql
stable
as $$
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'admin')::boolean,
    false
  );
$$;

-- True when the request is running with the Supabase service key, or as a
-- superuser during a migration or seed. Used by the profiles guard below so
-- trusted server paths can still write the columns clients may not.
--
-- PostgREST switches role per request (`set local role authenticated` /
-- `service_role`), so current_user is the right thing to read here — not
-- session_user, which stays the connection's authenticator role throughout.
create or replace function public.app_is_service()
returns boolean
language sql
stable
as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

-- ── Drop everything that depends on the old uuid identity ───────────────────

-- Firebase users never reach auth.users, so nothing triggers this any more.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Policies have to go before the columns they reference can be retyped.
drop policy if exists "profiles: read own"            on profiles;
drop policy if exists "profiles: admin reads all"     on profiles;
drop policy if exists "profiles: update own"          on profiles;
drop policy if exists "profiles: admin writes all"    on profiles;
drop policy if exists "products: public reads active" on products;
drop policy if exists "products: admin writes"       on products;
drop policy if exists "orders: read own"             on orders;
drop policy if exists "orders: create own"           on orders;
drop policy if exists "orders: admin full access"    on orders;
drop policy if exists "order_items: read own"              on order_items;
drop policy if exists "order_items: create for own order"  on order_items;
drop policy if exists "order_items: admin full access"     on order_items;
drop policy if exists "reviews: public read"        on reviews;
drop policy if exists "reviews: create own"         on reviews;
drop policy if exists "reviews: update own"         on reviews;
drop policy if exists "reviews: delete own"         on reviews;
drop policy if exists "reviews: admin full access"  on reviews;
drop policy if exists "deals: public reads active"  on deals;
drop policy if exists "deals: admin writes"         on deals;
drop policy if exists "updates: public read"        on updates;
drop policy if exists "updates: admin writes"       on updates;

-- ── Retype the identity columns ─────────────────────────────────────────────

alter table profiles drop constraint if exists profiles_id_fkey;
alter table orders   drop constraint if exists orders_user_id_fkey;
alter table reviews  drop constraint if exists reviews_user_id_fkey;

alter table profiles alter column id      type text using id::text;
alter table orders   alter column user_id type text using user_id::text;
alter table reviews  alter column user_id type text using user_id::text;

-- profiles is now the user table, so the ERD says so explicitly. Both are
-- `on delete set null` for the same reason the old auth.users keys were: an
-- order stays a valid receipt and a review keeps its author_name after the
-- account behind it is gone.
alter table orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references profiles (id) on delete set null;

alter table reviews
  add constraint reviews_user_id_fkey
  foreign key (user_id) references profiles (id) on delete set null;

comment on column profiles.id is
  'Firebase Auth UID. Populated by app/api/auth/session/route.ts on first sign-in.';

-- ── Authorisation ───────────────────────────────────────────────────────────

-- Claim first, table second. The claim avoids a profiles read on every policy
-- evaluation; the table is what survives a token being re-minted, and is what
-- the admin panel writes when it grants or revokes admin.
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

-- profiles.role and profiles.loyalty_points are not the account holder's to
-- write. 0001 enforced that inside the RLS update policy, by re-reading the
-- stored row in a WITH CHECK. A trigger is used instead because it also covers
-- writes that arrive through the admin policy, and it fails loudly rather than
-- letting a rejected write look like a no-op.
-- Deliberately SECURITY INVOKER (the default): app_is_service() compares
-- current_user, and inside a SECURITY DEFINER function that is the function's
-- owner rather than the caller — which would make the guard below pass for
-- everyone. is_admin() is still DEFINER, and is still safe to call from here.
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.app_is_service() or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'profiles.role is not client-writable.';
  end if;
  if new.loyalty_points is distinct from old.loyalty_points then
    raise exception 'profiles.loyalty_points is only changed by award_loyalty_points() and redeem_loyalty_points().';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_columns on profiles;
create trigger profiles_guard_columns
  before update on profiles
  for each row execute function public.guard_profile_columns();

-- ── Functions that referenced auth.uid() ────────────────────────────────────

-- Unchanged logic; app_uid() in place of auth.uid(), and a text comparison.
create or replace function public.redeem_loyalty_points(p_points integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
  uid       text := public.app_uid();
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;
  if p_points is null or p_points <= 0 then
    raise exception 'Points to redeem must be positive.';
  end if;

  update profiles
  set loyalty_points = loyalty_points - p_points
  where id = uid and loyalty_points >= p_points
  returning loyalty_points into remaining;

  if not found then
    raise exception 'Not enough points.';
  end if;

  return remaining;
end;
$$;

create or replace function public.cancel_order(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o   orders;
  uid text := public.app_uid();
begin
  select * into o from orders where id = p_order_id for update;

  if not found then
    raise exception 'Order not found.';
  end if;
  if uid is null or o.user_id is distinct from uid then
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

-- Recreated only so its plan is rebuilt against the retyped orders.user_id.
create or replace function public.award_loyalty_points(p_order_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  o   orders;
  pts integer;
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

-- ── Row Level Security, restated in full ────────────────────────────────────
-- Every policy below is the 0001 rule with app_uid() in place of auth.uid().
-- Listing them all here keeps this file a complete statement of who may read
-- and write what, rather than a diff against a file nobody reads twice.

alter table profiles    enable row level security;
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table reviews     enable row level security;
alter table deals       enable row level security;
alter table updates     enable row level security;

-- profiles ------------------------------------------------------------------
create policy "profiles: read own" on profiles
  for select using (id = public.app_uid());

create policy "profiles: admin reads all" on profiles
  for select using (public.is_admin());

-- role and loyalty_points are guarded by profiles_guard_columns above.
create policy "profiles: update own" on profiles
  for update using (id = public.app_uid())
  with check (id = public.app_uid());

create policy "profiles: admin writes all" on profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- products ------------------------------------------------------------------
create policy "products: public reads active" on products
  for select using (active or public.is_admin());

create policy "products: admin writes" on products
  for all using (public.is_admin()) with check (public.is_admin());

-- orders --------------------------------------------------------------------
create policy "orders: read own" on orders
  for select using (user_id = public.app_uid());

create policy "orders: create own" on orders
  for insert with check (
    user_id = public.app_uid()
    -- A client may only open an order as unpaid/pending. Promotion to 'paid'
    -- happens in the M-Pesa callback via the service-role key.
    and status = 'pending'
    and payment_status = 'unpaid'
    and source = 'storefront'
    and points_awarded = false
  );

create policy "orders: admin full access" on orders
  for all using (public.is_admin()) with check (public.is_admin());

-- order_items ---------------------------------------------------------------
create policy "order_items: read own" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and o.user_id = public.app_uid())
  );

create policy "order_items: create for own order" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.user_id = public.app_uid())
  );

create policy "order_items: admin full access" on order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- reviews -------------------------------------------------------------------
create policy "reviews: public read" on reviews
  for select using (true);

create policy "reviews: create own" on reviews
  for insert with check (user_id = public.app_uid());

create policy "reviews: update own" on reviews
  for update using (user_id = public.app_uid()) with check (user_id = public.app_uid());

create policy "reviews: delete own" on reviews
  for delete using (user_id = public.app_uid());

create policy "reviews: admin full access" on reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- deals ---------------------------------------------------------------------
create policy "deals: public reads active" on deals
  for select using (active or public.is_admin());

create policy "deals: admin writes" on deals
  for all using (public.is_admin()) with check (public.is_admin());

-- updates -------------------------------------------------------------------
create policy "updates: public read" on updates
  for select using (true);

create policy "updates: admin writes" on updates
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Storage
--
-- Three public-read buckets. `public` here means anyone with the URL can fetch
-- an object, which is what a product photo on a storefront is for; writes stay
-- behind is_admin() or an owner check.
--
--   product-images  <product-slug>/<timestamp>-<random>.<ext>   admin write
--   deal-images     <timestamp>-<random>.<ext>                  admin write
--   avatars         <firebase-uid>/<timestamp>.<ext>            owner write
--
-- The avatars rules key off the first path segment, so a user can only write
-- inside a folder named after their own UID.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/avif','image/gif']),
  ('deal-images', 'deal-images', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/avif','image/gif']),
  ('avatars', 'avatars', true, 2097152,
   array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 0001 created these for product-images only, and they still reference
-- is_admin(), whose body was replaced above. Drop and restate so all three
-- buckets are covered by one readable set of rules.
drop policy if exists "product-images: public read"   on storage.objects;
drop policy if exists "product-images: admin write"   on storage.objects;
drop policy if exists "product-images: admin update"  on storage.objects;
drop policy if exists "product-images: admin delete"  on storage.objects;
drop policy if exists "kelmon buckets: public read"   on storage.objects;
drop policy if exists "kelmon images: admin write"    on storage.objects;
drop policy if exists "kelmon images: admin update"   on storage.objects;
drop policy if exists "kelmon images: admin delete"   on storage.objects;
drop policy if exists "avatars: owner write"          on storage.objects;
drop policy if exists "avatars: owner update"         on storage.objects;
drop policy if exists "avatars: owner delete"         on storage.objects;

create policy "kelmon buckets: public read" on storage.objects
  for select using (bucket_id in ('product-images', 'deal-images', 'avatars'));

create policy "kelmon images: admin write" on storage.objects
  for insert with check (
    bucket_id in ('product-images', 'deal-images') and public.is_admin()
  );

create policy "kelmon images: admin update" on storage.objects
  for update using (
    bucket_id in ('product-images', 'deal-images') and public.is_admin()
  );

create policy "kelmon images: admin delete" on storage.objects
  for delete using (
    bucket_id in ('product-images', 'deal-images') and public.is_admin()
  );

-- storage.foldername(name) splits the object path; [1] is the top folder,
-- which must be the caller's own UID.
create policy "avatars: owner write" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and public.app_uid() is not null
    and (storage.foldername(name))[1] = public.app_uid()
  );

create policy "avatars: owner update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and public.app_uid() is not null
    and (storage.foldername(name))[1] = public.app_uid()
  );

create policy "avatars: owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (
      public.is_admin()
      or (public.app_uid() is not null and (storage.foldername(name))[1] = public.app_uid())
    )
  );
