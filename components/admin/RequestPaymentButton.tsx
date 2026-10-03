"use client";

import { useState } from "react";
import RequestPaymentModal from "@/components/admin/RequestPaymentModal";
import type { Product } from "@/lib/products";

/** The New Order button in a page's top bar. */
export default function RequestPaymentButton({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2.5 text-xs sm:px-4 font-black uppercase tracking-widest text-white shadow-lg shadow-purple-900/40 transition hover:bg-purple-500"
      >
        <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
        New Order
      </button>
      <RequestPaymentModal open={open} onClose={() => setOpen(false)} products={products} />
    </>
  );
}
