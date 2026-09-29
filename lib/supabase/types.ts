/**
 * Database types matching supabase/migrations/, 0001 through 0003.
 *
 * Hand-written so the app typechecks without a generation step. To regenerate
 * from the live schema instead:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 *
 * Identity columns — profiles.id, orders.user_id, reviews.user_id — are Firebase
 * UIDs. They were uuids referencing auth.users until 0003 moved authentication
 * to Firebase; they are `text` now, so the TypeScript `string` is unchanged but
 * a uuid is no longer a valid value.
 */

export type UserRole = "customer" | "admin";

export type OrderStatus =
  | "pending"
  | "awaiting_mpesa"
  | "confirmed"
  | "packed"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "initiated" | "paid" | "failed";
export type PaymentMethod = "mpesa" | "cod";
export type OrderSource = "storefront" | "admin_direct";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  /** Shown as "School" (optional). */
  campus: string | null;
  county: string | null;
  location: string | null;
  avatar_url: string | null;
  role: UserRole;
  /** Only meaningful with role 'admin'. Written by the server, never the client. */
  super_admin: boolean;
  loyalty_points: number;
  terms_accepted_at: string | null;
  terms_version: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductRow = {
  id: string;
  /** P001, B001… Assigned by the database; never written by the app. */
  code: string | null;
  gender: ProductGender;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  images: string[];
  sizes: string[];
  colors: string[];
  /** Colour name → photo URL. Colours without an entry keep the current photo. */
  color_images: Record<string, string>;
  stock: number;
  rating: number;
  review_count: number;
  badge: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderRow = {
  id: string;
  user_id: string | null;
  customer_name: string;
  phone: string;
  drop_point: string;
  county: string | null;
  campus: string | null;
  notes: string | null;
  payment_method: PaymentMethod;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  source: OrderSource;
  mpesa_checkout_request_id: string | null;
  mpesa_merchant_request_id: string | null;
  mpesa_receipt_number: string | null;
  mpesa_result_desc: string | null;
  mpesa_result_code: number | null;
  mpesa_requested_at: string | null;
  mpesa_phone: string | null;
  points_awarded: boolean;
  points_earned: number;
  /** Set by the orders_deduct_stock trigger; never written by app code. */
  stock_deducted: boolean;
  /** Set by the orders_set_paid_at trigger; never written by app code. */
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
  variant: string | null;
  image: string | null;
  category: string | null;
}

export type ReviewRow = {
  id: string;
  user_id: string | null;
  product_id: string | null;
  author_name: string;
  rating: number;
  body: string | null;
  created_at: string;
}

export type DealRow = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  code: string | null;
  discount_percent: number | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  created_at: string;
}

export type CategoryRow = {
  name: string;
  show_in_filter: boolean;
  sort_order: number;
  created_at: string;
}

export type ProductLikeRow = {
  user_id: string;
  product_id: string;
  created_at: string;
}

export type MpesaRequestRow = {
  checkout_request_id: string;
  merchant_request_id: string | null;
  order_id: string;
  phone: string | null;
  amount: number;
  status: "pending" | "paid" | "failed";
  result_code: number | null;
  result_desc: string | null;
  receipt: string | null;
  duplicate: boolean;
  created_at: string;
  updated_at: string;
}

/** Who a product is for. */
export type ProductGender = "men" | "women" | "unisex";

export type CodePrefixRow = {
  letter: string;
  name: string;
  category: string;
  last_number: number;
  created_at: string;
}

export type PaymentFailureRow = {
  id: string;
  order_id: string | null;
  checkout_request_id: string | null;
  result_code: number | null;
  result_desc: string | null;
  reason: string;
  phone: string | null;
  amount: number | null;
  created_at: string;
}

export type SiteSettingRow = {
  key: string;
  value: unknown;
  updated_at: string;
}

export type ContactMessageRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export type EmailAudience = "all_customers" | "customers_with_orders" | "custom";

export type EmailCampaignRow = {
  id: string;
  subject: string;
  body: string;
  audience: EmailAudience;
  recipient_count: number;
  failed_count: number;
  sent_by: string | null;
  created_at: string;
}

export type NotificationType =
  | "order"
  | "payment"
  | "payment_failed"
  | "stock"
  | "message"
  | "system";

export type AdminNotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type UpdateRow = {
  id: string;
  title: string;
  body: string;
  tag: string | null;
  created_at: string;
}

export type HomepageDropRow = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  /** Linked product: the card shows its live details and opens its page. */
  product_id: string | null;
}

/** Columns the database always fills in itself, so never required on insert. */
type Generated = "created_at" | "updated_at";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

/**
 * One table entry in the shape supabase-js expects.
 *
 * Two things matter here, and both cause every query on the table to infer as
 * `never` if they're wrong: the Row/Insert/Update types must be type *aliases*
 * (interfaces get no implicit index signature, so they don't satisfy
 * `Record<string, unknown>`), and `Relationships` must list the foreign keys
 * used by embedded selects such as `select("*, order_items(*)")`.
 */
type Table<
  Row,
  RequiredInsert extends keyof Row,
  Rels extends Relationship[] = [],
> = {
  Row: Row;
  Insert: Pick<Row, RequiredInsert> & Partial<Omit<Row, RequiredInsert>>;
  Update: Partial<Omit<Row, Extract<Generated, keyof Row>>>;
  Relationships: Rels;
};

/** order_items.order_id -> orders.id, which powers the order_items(*) embed. */
type OrderItemsRelationships = [
  {
    foreignKeyName: "order_items_order_id_fkey";
    columns: ["order_id"];
    isOneToOne: false;
    referencedRelation: "orders";
    referencedColumns: ["id"];
  },
  {
    foreignKeyName: "order_items_product_id_fkey";
    columns: ["product_id"];
    isOneToOne: false;
    referencedRelation: "products";
    referencedColumns: ["id"];
  },
];

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      products: Table<ProductRow, "id" | "name" | "price" | "category">;
      categories: Table<CategoryRow, "name">;
      orders: Table<
        OrderRow,
        "id" | "customer_name" | "phone" | "drop_point" | "subtotal" | "total"
      >;
      order_items: Table<
        OrderItemRow,
        "order_id" | "name" | "price" | "quantity",
        OrderItemsRelationships
      >;
      reviews: Table<ReviewRow, "author_name" | "rating">;
      product_likes: Table<ProductLikeRow, "user_id" | "product_id">;
      deals: Table<DealRow, "title">;
      updates: Table<UpdateRow, "title" | "body">;
      homepage_drops: Table<HomepageDropRow, "name" | "price" | "category" | "image">;
      payment_failures: Table<PaymentFailureRow, "reason">;
      code_prefixes: Table<CodePrefixRow, "letter" | "name" | "category">;
      mpesa_requests: Table<MpesaRequestRow, "checkout_request_id" | "order_id" | "amount">;
      site_settings: Table<SiteSettingRow, "key" | "value">;
      contact_messages: Table<
        ContactMessageRow,
        "first_name" | "last_name" | "email" | "message"
      >;
      email_campaigns: Table<EmailCampaignRow, "subject" | "body" | "audience">;
      admin_notifications: Table<AdminNotificationRow, "type" | "title">;
    };
    Views: { [_ in never]: never };
    Functions: {
      /** The caller's Firebase UID, from the JWT sub claim. */
      app_uid: { Args: Record<string, never>; Returns: string | null };
      app_is_admin_claim: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      award_loyalty_points: { Args: { p_order_id: string }; Returns: number };
      redeem_loyalty_points: { Args: { p_points: number }; Returns: number };
      cancel_order: { Args: { p_order_id: string }; Returns: undefined };
      next_order_id: { Args: { p_code: string }; Returns: string };
      adjust_product_stock: {
        Args: { p_product_id: string; p_delta: number };
        Returns: number | null;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      order_source: OrderSource;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
