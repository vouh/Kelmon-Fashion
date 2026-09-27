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
    <article
      className={`${compact ? "flex-shrink-0 w-56" : ""} group w-full overflow-hidden rounded-2xl bg-white dark:bg-surface border border-primary/15 shadow-[0_8px_24px_rgba(142,68,173,0.08)]`}
    >
      <div className="relative aspect-square bg-[#faf6fc] dark:bg-surface-container overflow-hidden">
        {product.badge && (
          <span className="absolute top-3 left-3 z-10 inline-flex h-6 px-2.5 items-center rounded-full bg-primary text-white text-[10px] font-semibold uppercase tracking-wider">
            {product.badge}
          </span>
        )}
        <Link href={`/product/${product.id}`} className="absolute inset-0 block">
          <Image
            src={product.image}
            alt={product.name}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 256px"
          />
        </Link>
      </div>
      <div className="px-3 py-3 text-center bg-primary/[0.06] dark:bg-primary/10 border-t border-primary/10">
        <Link href={`/product/${product.id}`}>
          <h3 className="text-[12px] md:text-[13px] font-medium text-on-surface hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1.5 flex justify-center">
          <StarRating rating={product.rating} />
        </div>
        <p className="mt-1.5 text-[13px] font-semibold text-primary">
          {product.originalPrice != null && (
            <span className="text-on-surface-variant/60 line-through font-normal mr-1.5 text-[11px]">
              {formatKes(product.originalPrice)}
            </span>
          )}
          {formatKes(product.price)}
        </p>
      </div>
    </article>
  );
}
