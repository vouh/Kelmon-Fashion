-- A homepage drop can point at a real product: the card then shows that
-- product's live name, price, category and photo, and opens its page. Deleting
-- the product falls back to the drop's own saved details.
ALTER TABLE "homepage_drops" ADD COLUMN "product_id" TEXT;

ALTER TABLE "homepage_drops"
  ADD CONSTRAINT "homepage_drops_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "homepage_drops_product_idx" ON "homepage_drops" ("product_id");
