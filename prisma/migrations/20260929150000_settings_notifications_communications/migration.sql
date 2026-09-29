-- ============================================================================
-- Admin settings, notifications and communications
--
--  1. site_settings: small key/value store for admin-editable settings, e.g.
--     which addresses receive contact-form emails.
--  2. contact_messages: every contact-form submission, so a message is never
--     lost if the email bounces.
--  3. email_campaigns: log of emails an admin sent from Communications.
--  4. admin_notifications: the admin feed. Filled by triggers below, so every
--     path that places an order, takes a payment or empties a shelf is covered
--     without app code having to remember to notify.
-- ============================================================================

-- 1. Settings ---------------------------------------------------------------

CREATE TABLE "site_settings" (
  "key"        TEXT NOT NULL,
  "value"      JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "site_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings: admin full access" ON "site_settings"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. Contact inbox ----------------------------------------------------------

CREATE TABLE "contact_messages" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "first_name" TEXT NOT NULL,
  "last_name"  TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "phone"      TEXT,
  "message"    TEXT NOT NULL,
  "read"       BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_messages_created_idx" ON "contact_messages" ("created_at" DESC);

-- Inserted by the contact route with the service role; admins read and manage.
ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_messages: admin full access" ON "contact_messages"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Sent emails ------------------------------------------------------------

CREATE TABLE "email_campaigns" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "subject"         TEXT NOT NULL,
  "body"            TEXT NOT NULL,
  -- 'all_customers' | 'customers_with_orders' | 'custom'
  "audience"        TEXT NOT NULL,
  "recipient_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count"    INTEGER NOT NULL DEFAULT 0,
  "sent_by"         TEXT,
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_campaigns_created_idx" ON "email_campaigns" ("created_at" DESC);

ALTER TABLE "email_campaigns" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_campaigns: admin full access" ON "email_campaigns"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Notifications ----------------------------------------------------------

CREATE TABLE "admin_notifications" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  -- 'order' | 'payment' | 'payment_failed' | 'stock' | 'message' | 'system'
  "type"       TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "body"       TEXT,
  "link"       TEXT,
  "read"       BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_notifications_created_idx" ON "admin_notifications" ("created_at" DESC);
CREATE INDEX "admin_notifications_unread_idx" ON "admin_notifications" ("created_at" DESC)
  WHERE NOT "read";

ALTER TABLE "admin_notifications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_notifications: admin full access" ON "admin_notifications"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.notify_admin(
  p_type text, p_title text, p_body text, p_link text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO admin_notifications (type, title, body, link)
  VALUES (p_type, p_title, p_body, p_link);
$$;

-- Only the triggers below (running as definer) and the service role call this.
REVOKE EXECUTE ON FUNCTION public.notify_admin(text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Orders: new order, payment received, cancelled.
CREATE OR REPLACE FUNCTION public.notify_order_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    PERFORM notify_admin(
      'order',
      'New order ' || new.id,
      new.customer_name || ' · KES ' || to_char(new.total, 'FM999,999,990') || ' · ' ||
        CASE WHEN new.payment_method = 'cod' THEN 'pay on delivery' ELSE 'M-Pesa' END,
      '/admin/orders'
    );
    RETURN new;
  END IF;

  IF new.payment_status = 'paid' AND old.payment_status IS DISTINCT FROM 'paid' THEN
    PERFORM notify_admin(
      'payment',
      'Payment received for ' || new.id,
      new.customer_name || ' paid KES ' || to_char(new.total, 'FM999,999,990') ||
        coalesce(' · ' || new.mpesa_receipt_number, ''),
      '/admin/transactions'
    );
  END IF;

  IF new.status = 'cancelled' AND old.status IS DISTINCT FROM 'cancelled' THEN
    PERFORM notify_admin(
      'order',
      'Order ' || new.id || ' cancelled',
      new.customer_name || ' · KES ' || to_char(new.total, 'FM999,999,990'),
      '/admin/orders'
    );
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER orders_notify
  AFTER INSERT OR UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_events();

-- Failed M-Pesa attempts.
CREATE OR REPLACE FUNCTION public.notify_payment_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_admin(
    'payment_failed',
    'Payment failed' || coalesce(' for ' || new.order_id, ''),
    new.reason || coalesce(' · KES ' || to_char(new.amount, 'FM999,999,990'), ''),
    '/admin/transactions/failed'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER payment_failures_notify
  AFTER INSERT ON "payment_failures"
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_failure();

-- Stock running low or out. Fires on the crossing only, not on every sale.
CREATE OR REPLACE FUNCTION public.notify_stock_levels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.stock = 0 AND old.stock > 0 THEN
    PERFORM notify_admin(
      'stock',
      new.name || ' is sold out',
      'It is hidden from the shop until you add stock.',
      '/admin/products'
    );
  ELSIF new.stock <= 3 AND old.stock > 3 THEN
    PERFORM notify_admin(
      'stock',
      new.name || ' is running low',
      'Only ' || new.stock || ' left in stock.',
      '/admin/products'
    );
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER products_notify_stock
  AFTER UPDATE OF stock ON "products"
  FOR EACH ROW EXECUTE FUNCTION public.notify_stock_levels();

-- Contact-form messages.
CREATE OR REPLACE FUNCTION public.notify_contact_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_admin(
    'message',
    'New message from ' || new.first_name || ' ' || new.last_name,
    left(new.message, 160),
    '/admin/communications'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER contact_messages_notify
  AFTER INSERT ON "contact_messages"
  FOR EACH ROW EXECUTE FUNCTION public.notify_contact_message();
