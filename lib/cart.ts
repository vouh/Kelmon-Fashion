import type { Product } from "@/lib/products";

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant?: string;
  category: string;
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
  };
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

export function getVariantOptions(category: string): { label: string; options: string[] } | null {
  switch (category) {
    case "Perfumes":
      return { label: "Size", options: ["30ml", "50ml", "100ml"] };
    case "Bags":
      return { label: "Color", options: ["Black", "Brown", "Cream"] };
    case "Fashion":
      return { label: "Size", options: ["S", "M", "L"] };
    case "Nails":
      return { label: "Kit", options: ["Nude", "Bold", "Classic"] };
    default:
      return null;
  }
}
