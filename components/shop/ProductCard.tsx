import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";
import StarRating from "@/components/ui/StarRating";

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: ProductCardProps) {
  return (
    <Link
      href={`/product/${product.id}`}
      className={`${compact ? "flex-shrink-0 w-64" : ""} elevated-dark overflow-hidden border border-primary/25 snap-start group relative block hover:border-primary transition-colors`}
    >
      {product.badge && (
        <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-primary font-label-caps text-[10px] uppercase tracking-widest text-white">
          {product.badge}
        </div>
      )}
      <div className="aspect-[4/5] bg-surface-container relative overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 256px"
        />
      </div>
      <div className="p-5">
        <h3 className="font-title-lg text-title-lg text-on-surface truncate">{product.name}</h3>
        <div className="mt-2">
          <StarRating rating={product.rating} />
        </div>
        <p className="font-body-md text-body-md text-secondary mt-2">{formatKes(product.price)}</p>
      </div>
    </Link>
  );
}
