import type { Product } from "@/lib/products";

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant?: string;
  category: string;
  /**
   * Stock when the item was added. A convenience cap for the cart's + buttons
   * only; /api/orders re-checks against the live row before anything is paid.
   */
  stock?: number;
}

export function cartLineKey(productId: string, variant?: string): string {
  return `${productId}::${variant ?? "default"}`;
}

export function lineFromProduct(product: Product, quantity: number, variant?: string): CartLine {
  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    quantity,
    variant,
    category: product.category,
    stock: product.stock,
  };
}

/** Units of a product across all its lines (sizes/colours share one stock). */
export function quantityOfProduct(lines: CartLine[], productId: string, exceptKey?: string): number {
  return lines
    .filter((l) => l.productId === productId && cartLineKey(l.productId, l.variant) !== exceptKey)
    .reduce((sum, l) => sum + l.quantity, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Free campus delivery when subtotal ≥ KES 3,000; otherwise flat fee. */
export const FREE_DELIVERY_THRESHOLD = 3000;
export const DELIVERY_FEE = 150;

export function deliveryFeeFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}