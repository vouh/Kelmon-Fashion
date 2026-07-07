import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: ProductCardProps) {
  return (
    <Link
      href={`/product/${product.id}`}
      className={`${compact ? "flex-shrink-0 w-64" : ""} elevated-dark rounded-2xl overflow-hidden hairline-gold snap-start group relative block`}
    >
      {product.badge && (
        <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-gradient-to-r from-primary-container to-on-primary rounded-full font-label-caps text-[10px] uppercase tracking-widest text-white shadow-lg">
          {product.badge}
        </div>
      )}
      <div className="aspect-[4/5] bg-surface-container relative overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 256px"
        />
      </div>
      <div className="p-5">
        <h3 className="font-title-lg text-title-lg text-on-surface truncate">{product.name}</h3>
        <p className="font-body-md text-body-md text-secondary mt-2">{formatKes(product.price)}</p>
      </div>
    </Link>
  );
}
