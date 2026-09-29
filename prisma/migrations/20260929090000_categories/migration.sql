-- ============================================================================
-- Categories
--
-- products.category stays free text. This table is the list the admin product
-- form offers, and `show_in_filter` picks which of them appear as filter chips
-- on /shop, so the chip row stays short however many categories exist.
-- ============================================================================

CREATE TABLE "categories" (
    "name" TEXT NOT NULL,
    "show_in_filter" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("name")
);

ALTER TABLE "categories"
  ADD CONSTRAINT categories_name_not_blank CHECK (length(trim(name)) BETWEEN 1 AND 60);

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories: public reads" ON "categories"
  FOR SELECT USING (true);

CREATE POLICY "categories: admin writes" ON "categories"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO "categories" (name, show_in_filter, sort_order) VALUES
  ('Bags', true, 1),
  ('Perfumes', true, 2),
  ('Accessories', true, 3)
ON CONFLICT (name) DO NOTHING;

-- Every category already used by a product, hidden from the filter until an
-- admin switches it on.
INSERT INTO "categories" (name, show_in_filter, sort_order)
SELECT DISTINCT category, false, 100 FROM "products"
ON CONFLICT (name) DO NOTHING;
