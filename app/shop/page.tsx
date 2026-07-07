import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { shopProducts, formatKes } from "@/lib/products";

export default function ShopPage() {
  return (
    <AppShell activeNav="shop">
      <main className="flex-1 w-full flex flex-col min-h-screen">
        <div className="px-margin-mobile md:px-margin-desktop pt-lg pb-md bg-surface border-b border-white/5 sticky top-0 z-30 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
            <div>
              <h1 className="font-display-lg text-display-lg text-on-surface mb-2 tracking-tight">Shop</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Curated premium essentials.</p>
            </div>
            <div className="w-full md:w-96 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input className="input-dark w-full h-12 pl-12 pr-4 rounded-lg text-on-surface font-body-md text-body-md placeholder-on-surface-variant/50" placeholder="Search products..." type="text" />
            </div>
          </div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {["All", "Bags", "Perfumes", "Fashion", "Nails"].map((cat, i) => (
                <button key={cat} className={`chip px-4 py-1.5 rounded-full font-label-caps text-label-caps uppercase transition-colors ${i === 0 ? "active" : "hover:bg-secondary/20 hover:text-secondary"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 p-margin-mobile md:p-margin-desktop bg-background">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
            {shopProducts.map((product) => (
              <div key={product.id} className="product-card rounded-2xl overflow-hidden flex flex-col group relative">
                {product.badge && (
                  <div className="absolute top-4 right-4 z-10 bg-primary-container/90 text-on-primary-container px-3 py-1 rounded-full font-label-caps text-label-caps uppercase backdrop-blur-sm shadow-md">
                    {product.badge}
                  </div>
                )}
                <Link href={`/product/${product.id}`} className="aspect-[4/5] relative overflow-hidden bg-surface-dim block">
                  <Image src={product.image} alt={product.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />
                </Link>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <Link href={`/product/${product.id}`} className="font-title-lg text-title-lg text-on-surface group-hover:text-primary transition-colors">
                      {product.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                    <span className="text-xs text-on-surface-variant ml-1">({product.reviewCount})</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div>
                      {product.originalPrice && (
                        <span className="text-xs text-on-surface-variant line-through block mb-1">{formatKes(product.originalPrice)}</span>
                      )}
                      <p className="font-headline-sm text-headline-sm text-secondary">{formatKes(product.price)}</p>
                    </div>
                    <Link href={`/product/${product.id}`} className="btn-primary w-10 h-10 rounded-full flex items-center justify-center text-white">
                      <span className="material-symbols-outlined">add_shopping_cart</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
