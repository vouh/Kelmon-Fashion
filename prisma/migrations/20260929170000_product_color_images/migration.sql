-- ============================================================================
-- products.color_images: a photo per colour
--
-- A JSON object keyed by colour name, e.g. {"Black": "https://…/black.webp"}.
-- The product page swaps to that photo when the shopper picks the colour.
-- Colours without an entry simply keep the current photo.
-- ============================================================================

ALTER TABLE "products"
  ADD COLUMN "color_images" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "products"
  ADD CONSTRAINT "products_color_images_object"
  CHECK (jsonb_typeof("color_images") = 'object');
