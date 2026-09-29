-- ============================================================================
-- Who a product is for: men, women, or unisex (both). Chosen with a tab in the
-- admin product form. Existing products start as unisex until edited.
-- ============================================================================

ALTER TABLE "products" ADD COLUMN "gender" TEXT NOT NULL DEFAULT 'unisex';

ALTER TABLE "products"
  ADD CONSTRAINT "products_gender_valid" CHECK ("gender" IN ('men', 'women', 'unisex'));

CREATE INDEX "products_gender_idx" ON "products" ("gender");
