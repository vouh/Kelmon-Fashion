-- ============================================================================
-- Product codes and readable order numbers
--
--  1. code_prefixes: one letter per category (P = Perfumes, B = Bags, …) with
--     a counter of how far that letter has got. Admins add letters in
--     Products → Settings; the counter only ever moves when a product is added.
--  2. products.code: P001, P002, B001… assigned by the database when a product
--     is saved, never changed afterwards (not by restocks, sell-outs, renames or
--     category changes) and never reused, even if the product is deleted.
--  3. next_order_id(): order numbers like P001-20260930-01 — the priciest
--     item's code, the date in Kenya, and that day's running order number.
-- ============================================================================

-- 1. Letters -----------------------------------------------------------------

CREATE TABLE "code_prefixes" (
  "letter"      TEXT NOT NULL,
  "category"    TEXT NOT NULL,
  -- Highest number handed out so far: 12 means the last code was P012.
  "last_number" INTEGER NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "code_prefixes_pkey" PRIMARY KEY ("letter"),
  CONSTRAINT "code_prefixes_letter_valid" CHECK ("letter" ~ '^[A-Z]$'),
  CONSTRAINT "code_prefixes_last_number_valid" CHECK ("last_number" >= 0)
);

-- One letter per category, compared the way products are matched to it.
CREATE UNIQUE INDEX "code_prefixes_category_key" ON "code_prefixes" (lower(trim("category")));

ALTER TABLE "code_prefixes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "code_prefixes: public reads" ON "code_prefixes"
  FOR SELECT USING (true);

CREATE POLICY "code_prefixes: admin writes" ON "code_prefixes"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- The counter is never edited by hand, and a letter that has been used stays
-- tied to its category — otherwise old codes would point at the wrong thing.
CREATE OR REPLACE FUNCTION public.guard_code_prefixes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF tg_op = 'DELETE' THEN
    IF old.last_number > 0 THEN
      RAISE EXCEPTION 'Letter % has already been used (up to %) and cannot be deleted.',
        old.letter, old.letter || repeat('0', greatest(0, 3 - length(old.last_number::text))) || old.last_number::text;
    END IF;
    RETURN old;
  END IF;

  IF tg_op = 'INSERT' THEN
    -- A new letter always starts from zero.
    new.last_number := 0;
    new.letter := upper(trim(new.letter));
    new.category := trim(new.category);
    RETURN new;
  END IF;

  -- UPDATE: only the code-assigning trigger (nested, depth > 1) moves the counter.
  IF new.last_number IS DISTINCT FROM old.last_number AND pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION 'The code counter can''t be changed by hand; it moves when products are added.';
  END IF;
  IF new.last_number < old.last_number THEN
    RAISE EXCEPTION 'The code counter never goes backwards.';
  END IF;
  IF old.last_number > 0 AND (new.letter IS DISTINCT FROM old.letter OR lower(trim(new.category)) IS DISTINCT FROM lower(trim(old.category))) THEN
    RAISE EXCEPTION 'Letter % is already in use, so its letter and category are locked.', old.letter;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER code_prefixes_guard
  BEFORE INSERT OR UPDATE OR DELETE ON "code_prefixes"
  FOR EACH ROW EXECUTE FUNCTION public.guard_code_prefixes();

-- 2. Product codes -----------------------------------------------------------

ALTER TABLE "products" ADD COLUMN "code" TEXT;
CREATE UNIQUE INDEX "products_code_key" ON "products" ("code") WHERE "code" IS NOT NULL;

-- Takes the next number for a category, atomically: the UPDATE row-locks the
-- letter, so two products saved at once can't both get P003. NULL when the
-- category has no letter yet.
CREATE OR REPLACE FUNCTION public.take_product_code(p_category text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l text;
  n integer;
BEGIN
  UPDATE code_prefixes
  SET last_number = last_number + 1
  WHERE lower(trim(category)) = lower(trim(p_category))
  RETURNING letter, last_number INTO l, n;

  IF l IS NULL THEN
    RETURN NULL;
  END IF;
  -- Three digits to start (P001); grows naturally past 999 (P1000). Not
  -- lpad(): it truncates longer values, which would turn 1000 into 100.
  RETURN l || repeat('0', greatest(0, 3 - length(n::text))) || n::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.take_product_code(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_product_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tg_op = 'UPDATE' AND old.code IS NOT NULL THEN
    -- Permanent: nothing changes a code once it's given.
    new.code := old.code;
    RETURN new;
  END IF;

  -- A new product, or an uncoded one being saved: the code always comes from
  -- the counter, never from whatever the client sent. Stays NULL while the
  -- category has no letter.
  new.code := take_product_code(new.category);
  RETURN new;
END;
$$;

CREATE TRIGGER products_assign_code
  BEFORE INSERT OR UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION public.assign_product_code();

-- A new letter codes the products already waiting in its category, oldest first.
CREATE OR REPLACE FUNCTION public.code_existing_products()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT id FROM products
    WHERE code IS NULL AND lower(trim(category)) = lower(trim(new.category))
    ORDER BY created_at, id
  LOOP
    -- Touching the row lets assign_product_code() hand out the next number.
    UPDATE products SET code = NULL WHERE id = p.id AND code IS NULL;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE TRIGGER code_prefixes_code_existing
  AFTER INSERT ON "code_prefixes"
  FOR EACH ROW EXECUTE FUNCTION public.code_existing_products();

-- Starting letters. Matched to whatever the categories are actually called.
INSERT INTO "code_prefixes" (letter, category)
VALUES ('P', coalesce((SELECT category FROM products WHERE lower(trim(category)) IN ('perfumes', 'perfume') LIMIT 1), 'Perfumes'));
INSERT INTO "code_prefixes" (letter, category)
VALUES ('B', coalesce((SELECT category FROM products WHERE lower(trim(category)) IN ('bags', 'bag') LIMIT 1), 'Bags'));

-- 3. Order numbers -----------------------------------------------------------

CREATE TABLE "order_day_counters" (
  "day"         DATE NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "order_day_counters_pkey" PRIMARY KEY ("day")
);

-- Only reached through next_order_id().
ALTER TABLE "order_day_counters" ENABLE ROW LEVEL SECURITY;

-- P001-20260930-01: the product code (or KM when there isn't one), the date in
-- Nairobi, and that day's running number — two digits, growing past 99.
CREATE OR REPLACE FUNCTION public.next_order_id(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d date := (now() AT TIME ZONE 'Africa/Nairobi')::date;
  n integer;
  prefix text := upper(coalesce(nullif(trim(p_code), ''), 'KM'));
BEGIN
  IF prefix !~ '^[A-Z]{1,3}[0-9]{0,7}$' THEN
    prefix := 'KM';
  END IF;

  INSERT INTO order_day_counters (day, last_number) VALUES (d, 1)
  ON CONFLICT (day) DO UPDATE SET last_number = order_day_counters.last_number + 1
  RETURNING last_number INTO n;

  -- Padded to two digits (01), never truncated: order 100 is 100, not 10.
  RETURN prefix || '-' || to_char(d, 'YYYYMMDD') || '-' || repeat('0', greatest(0, 2 - length(n::text))) || n::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.next_order_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_order_id(text) TO authenticated, service_role;
