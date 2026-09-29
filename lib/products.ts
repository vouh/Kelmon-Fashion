import type { ProductRow } from "@/lib/supabase/types";

export type NavItem =
  | "home"
  | "shop"
  | "cart"
  | "orders"
  | "profile"
  | "about"
  | "contact";

/**
 * Shape the storefront cards render. Kept byte-compatible with the previous
 * hardcoded version so every ProductCard / slider / carousel works unchanged —
 * `image` stays a single string, with the rest of the gallery in `images`.
 */
export interface Product {
  id: string;
  /** Permanent product code, e.g. P001. Null until its category has a letter. */
  code?: string | null;
  /** Who it's for: men, women or unisex. */
  gender?: "men" | "women" | "unisex";
  name: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  badge?: string;
  originalPrice?: number;

  // Present when the product came from the database.
  description?: string;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  /** Colour name → photo shown when that colour is picked. */
  colorImages?: Record<string, string>;
  stock?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: string;
}

const PLACEHOLDER_IMAGE = "/logo.png";

/** Maps a products row to the storefront Product shape. */
export function productFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    code: row.code ?? null,
    gender: row.gender ?? "unisex",
    name: row.name,
    price: Number(row.price),
    category: row.category,
    image: row.images?.[0] ?? PLACEHOLDER_IMAGE,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    badge: row.badge ?? undefined,
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    description: row.description ?? undefined,
    images: row.images ?? [],
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
    colorImages: row.color_images ?? {},
    stock: row.stock,
  };
}

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

/** True when the product has a real discount to advertise. */
export function discountPercent(product: Product): number | null {
  if (!product.originalPrice || product.originalPrice <= product.price) return null;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}

export const GENDER_LABELS: Record<"men" | "women" | "unisex", string> = {
  men: "Men",
  women: "Ladies",
  unisex: "Unisex",
};
