-- ============================================================================
-- Pre-order products: shown with a gold "P" on shop cards and "Available on
-- pre-order" on the product page. Ticked in the admin product form.
-- ============================================================================

ALTER TABLE "products" ADD COLUMN "preorder" BOOLEAN NOT NULL DEFAULT false;

-- The KES 1,800 perfume range starts out on pre-order.
UPDATE "products" SET "preorder" = true
WHERE "code" IN ('P001', 'P002', 'P003', 'P004', 'P005', 'P006', 'P007');
