/**
 * Database types matching supabase/migrations/0001_init.sql.
 *
 * Hand-written so the app typechecks without a generation step. To regenerate
 * from the live schema instead:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
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
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  campus: string | null;
  avatar_url: string | null;
  role: UserRole;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
}

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string;
  images: string[];
  sizes: string[];
  colors: string[];
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
  mpesa_phone: string | null;
  points_awarded: boolean;
  points_earned: number;
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

export type SalonServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: string | null;
  icon: string | null;
  image: string | null;
  active: boolean;
  created_at: string;
}

export type SalonBookingRow = {
  id: string;
  user_id: string | null;
  service_id: string | null;
  service_name: string;
  customer_name: string;
  phone: string;
  scheduled_for: string | null;
  notes: string | null;
  total: number;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
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

export type UpdateRow = {
  id: string;
  title: string;
  body: string;
  tag: string | null;
  created_at: string;
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
      orders: Table<
        OrderRow,
        "id" | "customer_name" | "phone" | "drop_point" | "subtotal" | "total"
      >;
      order_items: Table<
        OrderItemRow,
        "order_id" | "name" | "price" | "quantity",
        OrderItemsRelationships
      >;
      salon_services: Table<SalonServiceRow, "id" | "name" | "price">;
      salon_bookings: Table<SalonBookingRow, "service_name" | "customer_name" | "phone">;
      reviews: Table<ReviewRow, "author_name" | "rating">;
      deals: Table<DealRow, "title">;
      updates: Table<UpdateRow, "title" | "body">;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      award_loyalty_points: { Args: { p_order_id: string }; Returns: number };
      redeem_loyalty_points: { Args: { p_points: number }; Returns: number };
      cancel_order: { Args: { p_order_id: string }; Returns: undefined };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      order_source: OrderSource;
      booking_status: BookingStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
