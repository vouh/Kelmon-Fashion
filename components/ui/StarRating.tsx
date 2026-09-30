interface StarRatingProps {
  reviewCount?: number;
  size?: "sm" | "md";
}

/** Always five gold stars (#C5A059); the review count sits beside them once there is one. */
export default function StarRating({ reviewCount, size = "sm" }: StarRatingProps) {
  const iconSize = size === "sm" ? "text-[15px]" : "text-base";

  return (
    <div className="flex items-center gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`material-symbols-outlined ${iconSize} text-[#C5A059]`}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          star
        </span>
      ))}
      {typeof reviewCount === "number" && reviewCount > 0 && (
        <span className="text-xs text-on-surface-variant ml-1">({reviewCount})</span>
      )}
    </div>
  );
}
