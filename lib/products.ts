import type { ProductRow } from "@/lib/supabase/types";

export type NavItem =
  | "home"
  | "shop"
  | "salon"
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
    stock: row.stock,
  };
}

/**
 * Starter categories, offered in the admin product form while `products` is
 * still empty and getCategories() has nothing to derive a list from. Category
 * is free text, so this is a convenience, not a constraint — and the storefront
 * never uses it, because a filter chip should only appear for a category that
 * has something in it.
 */
export const categories = ["Bags", "Perfumes", "Fashion", "Nails"];

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

/** True when the product has a real discount to advertise. */
export function discountPercent(product: Product): number | null {
  if (!product.originalPrice || product.originalPrice <= product.price) return null;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}
