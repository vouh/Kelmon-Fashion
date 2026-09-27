interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
}

/** Stars always use Kelmon gold (#C5A059). */
export default function StarRating({ rating, reviewCount, size = "sm" }: StarRatingProps) {
  const iconSize = size === "sm" ? "text-[15px]" : "text-base";

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(rating);
        return (
          <span
            key={i}
            className={`material-symbols-outlined ${iconSize} ${
              filled ? "text-[#C5A059]" : "text-[#C5A059]/30"
            }`}
            style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
            aria-hidden="true"
          >
            star
          </span>
        );
      })}
      {typeof reviewCount === "number" && (
        <span className="text-xs text-on-surface-variant ml-1">({reviewCount})</span>
      )}
    </div>
  );
}
