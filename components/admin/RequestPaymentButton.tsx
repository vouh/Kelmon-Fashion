"use client";

import { useState } from "react";
import RequestPaymentModal from "@/components/admin/RequestPaymentModal";
import type { Product } from "@/lib/products";

export default function RequestPaymentButton({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-xl border border-purple-400/20 bg-purple-400/10 px-4 py-3 text-left transition-all hover:bg-purple-400/20"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-400/20">
          <span className="material-symbols-outlined text-lg text-purple-300">send_to_mobile</span>
        </div>
        <div>
          <p className="text-xs font-black text-white">Request Payment</p>
          <p className="mt-0.5 text-[9px] font-bold text-white/30">
            Create a direct order and send an STK push
          </p>
        </div>
        <span className="material-symbols-outlined ml-auto text-white/20 transition-colors group-hover:text-white/50">
          chevron_right
        </span>
      </button>
      <RequestPaymentModal open={open} onClose={() => setOpen(false)} products={products} />
    </>
  );
}
