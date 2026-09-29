-- ============================================================================
-- Double-charge protection for M-Pesa
--
--  1. mpesa_requests: one row per STK prompt ever sent. orders keeps only the
--     latest CheckoutRequestID, so without this a customer who approves an
--     *earlier* prompt pays, but the callback can't find the order — it stays
--     "unpaid" and they get asked to pay again. The callback now looks the
--     order up here.
--  2. orders.mpesa_requested_at: when the live prompt was sent. The STK route
--     claims it atomically, so a double-click, a quick "Try again" or an admin
--     resend can't put a second prompt on the phone while one is still open.
--  3. A receipt number can only be recorded once, and a second successful
--     payment for an already-paid order is flagged for refund, never lost.
-- ============================================================================

ALTER TABLE "orders" ADD COLUMN "mpesa_requested_at" TIMESTAMPTZ(6);

CREATE TABLE "mpesa_requests" (
  "checkout_request_id" TEXT NOT NULL,
  "merchant_request_id" TEXT,
  "order_id"            TEXT NOT NULL,
  "phone"               TEXT,
  "amount"              DECIMAL(10,2) NOT NULL,
  -- 'pending' | 'paid' | 'failed'
  "status"              TEXT NOT NULL DEFAULT 'pending',
  "result_code"         INTEGER,
  "result_desc"         TEXT,
  "receipt"             TEXT,
  -- True when this payment landed on an order that was already paid by
  -- another prompt: the customer paid twice and is owed a refund.
  "duplicate"           BOOLEAN NOT NULL DEFAULT false,
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "mpesa_requests_pkey" PRIMARY KEY ("checkout_request_id"),
  CONSTRAINT "mpesa_requests_status_valid" CHECK ("status" IN ('pending', 'paid', 'failed'))
);

ALTER TABLE "mpesa_requests"
  ADD CONSTRAINT "mpesa_requests_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "mpesa_requests_order_idx" ON "mpesa_requests" ("order_id", "created_at" DESC);
CREATE UNIQUE INDEX "mpesa_requests_receipt_key" ON "mpesa_requests" ("receipt") WHERE "receipt" IS NOT NULL;
CREATE INDEX "mpesa_requests_duplicate_idx" ON "mpesa_requests" ("created_at" DESC) WHERE "duplicate";

CREATE TRIGGER mpesa_requests_touch BEFORE UPDATE ON "mpesa_requests"
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Written by the server with the service role; admins can read it.
ALTER TABLE "mpesa_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mpesa_requests: admin reads" ON "mpesa_requests"
  FOR SELECT USING (public.is_admin());

-- Prompts sent before this migration: record the one each order still knows,
-- so their late callbacks keep resolving.
INSERT INTO "mpesa_requests" (checkout_request_id, merchant_request_id, order_id, phone, amount, status, receipt, created_at)
SELECT mpesa_checkout_request_id, mpesa_merchant_request_id, id, mpesa_phone, total,
       CASE payment_status WHEN 'paid' THEN 'paid' WHEN 'failed' THEN 'failed' ELSE 'pending' END,
       mpesa_receipt_number, updated_at
FROM "orders"
WHERE mpesa_checkout_request_id IS NOT NULL
ON CONFLICT DO NOTHING;
