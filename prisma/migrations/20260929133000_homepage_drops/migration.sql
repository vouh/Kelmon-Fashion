-- Admin-managed cards for the homepage “The drops are dropping” carousel.
CREATE TABLE "homepage_drops" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "category" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "homepage_drops_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "homepage_drops_name_not_blank" CHECK (length(trim("name")) BETWEEN 1 AND 160),
  CONSTRAINT "homepage_drops_category_not_blank" CHECK (length(trim("category")) BETWEEN 1 AND 60),
  CONSTRAINT "homepage_drops_price_non_negative" CHECK ("price" >= 0)
);

CREATE INDEX "homepage_drops_active_sort_idx"
  ON "homepage_drops" ("active", "sort_order");

ALTER TABLE "homepage_drops" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homepage_drops: public reads active" ON "homepage_drops"
  FOR SELECT USING (active OR public.is_admin());

CREATE POLICY "homepage_drops: admin writes" ON "homepage_drops"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Start with the existing visible catalogue cards. Admins can then freely
-- change the image, copy, price, category, or visibility from Homepage Drops.
INSERT INTO "homepage_drops" ("name", "price", "category", "image", "sort_order")
SELECT name, price, category, images[1], row_number() OVER (ORDER BY created_at DESC)
FROM "products"
WHERE active AND stock > 0 AND cardinality(images) > 0;
