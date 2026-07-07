"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("50ml");
  const sizes = ["30ml", "50ml", "100ml"];

  return (
    <AppShell activeNav="shop" hideBottomNav>
      <main className="w-full max-w-[1200px] mx-auto mt-16 md:mt-0 p-margin-mobile md:p-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-xl pb-32 md:pb-12">
        <section className="md:col-span-6 lg:col-span-7 flex flex-col gap-sm">
          <div className="relative w-full aspect-[4/5] bg-[#141414] rounded-xl overflow-hidden hairline-gold shadow-[0_20px_40px_rgba(0,0,0,0.5)] group">
            <Image src={product.image} alt={product.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" priority />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <div className="w-2 h-2 rounded-full bg-white/30" />
              <div className="w-2 h-2 rounded-full bg-white/30" />
            </div>
          </div>
        </section>

        <section className="md:col-span-6 lg:col-span-5 flex flex-col">
          <div className="mb-lg">
            <div className="flex justify-between items-start mb-2">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">{product.name}</h1>
              <button className="text-on-surface-variant hover:text-secondary transition-colors">
                <span className="material-symbols-outlined">favorite_border</span>
              </button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="font-headline-sm text-headline-sm text-secondary">{formatKes(product.price)}</div>
              <div className="flex items-center gap-1 text-secondary-fixed text-sm">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="font-body-md font-bold mt-0.5">{product.rating}</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141414] border border-green-900/50">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="font-label-caps text-label-caps text-green-400">In Stock</span>
            </div>
          </div>

          <div className="mb-lg">
            <h3 className="font-title-lg text-title-lg text-on-surface mb-4">Size</h3>
            <div className="flex flex-wrap gap-3">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-6 py-3 rounded-lg font-button-text text-button-text transition-colors ${
                    selectedSize === size
                      ? "bg-primary-container/20 border border-primary text-primary shadow-[0_0_15px_rgba(236,178,255,0.15)]"
                      : "bg-[#141414] border border-white/10 text-on-surface-variant hover:border-white/30"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 mb-xl">
            <details open className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none font-title-lg text-title-lg text-on-surface py-2">
                Product Details
                <span className="material-symbols-outlined transform group-open:rotate-180 transition-transform text-on-surface-variant">expand_more</span>
              </summary>
              <div className="mt-4 font-body-lg text-body-lg text-on-surface-variant/80 space-y-4">
                <p>A timeless masterpiece. The legendary fragrance that continues to captivate generations.</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Concentration: Eau de Parfum</li>
                  <li>Size: {selectedSize}</li>
                  <li>Category: {product.category}</li>
                </ul>
              </div>
            </details>
          </div>

          <div className="mt-auto hidden md:flex flex-col gap-4 bg-[#141414] p-6 rounded-xl hairline-gold shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-surface-dim rounded-lg border border-white/10 h-12">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-12 h-full flex items-center justify-center text-on-surface-variant hover:text-white">
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <span className="w-8 text-center font-button-text text-button-text">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)} className="w-12 h-full flex items-center justify-center text-on-surface-variant hover:text-white">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
              <Link href="/cart" className="flex-1 h-12 rounded-lg btn-secondary font-button-text text-button-text flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                Add to Cart
              </Link>
            </div>
            <Link href="/cart" className="w-full h-12 rounded-lg btn-primary font-button-text text-button-text uppercase tracking-wider flex items-center justify-center">
              Buy Now
            </Link>
          </div>
        </section>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 w-full z-50 glass-panel px-4 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#0F0F0F] rounded-lg border border-white/10 h-12 shrink-0">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-full flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined">remove</span>
            </button>
            <span className="w-6 text-center font-button-text text-button-text">{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)} className="w-10 h-full flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
          <Link href="/cart" className="flex-1 h-12 rounded-lg btn-secondary font-button-text text-button-text flex items-center justify-center">
            Add to Cart
          </Link>
        </div>
        <Link href="/cart" className="w-full h-12 rounded-lg btn-primary font-button-text text-button-text uppercase tracking-wider flex items-center justify-center shadow-[0_0_15px_rgba(142,68,173,0.3)]">
          Buy Now
        </Link>
      </div>
    </AppShell>
  );
}
