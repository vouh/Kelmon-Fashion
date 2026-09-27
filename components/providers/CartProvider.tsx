"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/lib/products";
import {
  cartItemCount,
  cartLineKey,
  cartSubtotal,
  deliveryFeeFor,
  lineFromProduct,
  type CartLine,
} from "@/lib/cart";

const STORAGE_KEY = "kelmon-cart";

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addItem: (product: Product, quantity?: number, variant?: string) => void;
  setQuantity: (productId: string, variant: string | undefined, quantity: number) => void;
  removeItem: (productId: string, variant?: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addItem = useCallback((product: Product, quantity = 1, variant?: string) => {
    setLines((prev) => {
      const key = cartLineKey(product.id, variant);
      const existing = prev.find((l) => cartLineKey(l.productId, l.variant) === key);
      if (existing) {
        return prev.map((l) =>
          cartLineKey(l.productId, l.variant) === key
            ? { ...l, quantity: l.quantity + quantity }
            : l
        );
      }
      return [...prev, lineFromProduct(product, quantity, variant)];
    });
  }, []);

  const setQuantity = useCallback((productId: string, variant: string | undefined, quantity: number) => {
    setLines((prev) => {
      const key = cartLineKey(productId, variant);
      if (quantity <= 0) {
        return prev.filter((l) => cartLineKey(l.productId, l.variant) !== key);
      }
      return prev.map((l) =>
        cartLineKey(l.productId, l.variant) === key ? { ...l, quantity } : l
      );
    });
  }, []);

  const removeItem = useCallback((productId: string, variant?: string) => {
    const key = cartLineKey(productId, variant);
    setLines((prev) => prev.filter((l) => cartLineKey(l.productId, l.variant) !== key));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const subtotal = useMemo(() => cartSubtotal(lines), [lines]);
  const deliveryFee = useMemo(() => deliveryFeeFor(subtotal), [subtotal]);
  const total = subtotal + deliveryFee;
  const itemCount = useMemo(() => cartItemCount(lines), [lines]);

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      subtotal,
      deliveryFee,
      total,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [lines, itemCount, subtotal, deliveryFee, total, addItem, setQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
