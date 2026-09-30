/** Gold "P" marking a pre-order product, pinned to the top-right of its photo. */
export default function PreorderBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const dimensions = size === "md" ? "h-9 w-9 text-[17px] top-4 right-4" : "h-7 w-7 text-[14px] top-3 right-3";
  return (
    <span
      role="img"
      aria-label="Pre-order"
      title="Available on pre-order"
      className={`absolute z-20 inline-flex items-center justify-center rounded-full border border-white/70 bg-[linear-gradient(135deg,#E9D29A_0%,#C5A059_45%,#9C7A36_100%)] font-serif font-bold leading-none text-white shadow-[0_4px_12px_rgba(156,122,54,0.45)] [text-shadow:0_1px_1px_rgba(0,0,0,0.25)] ${dimensions}`}
    >
      P
    </span>
  );
}
