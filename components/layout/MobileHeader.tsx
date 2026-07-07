import Link from "next/link";

export default function MobileHeader() {
  return (
    <header className="md:hidden fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile h-16 bg-surface/80 backdrop-blur-3xl border-b border-white/10 shadow-xl">
      <Link href="/" className="font-display-md text-display-md text-primary drop-shadow-[0_0_10px_rgba(236,178,255,0.5)]">
        Kelmon
      </Link>
      <div className="flex gap-4">
        <Link href="/cart" className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">shopping_cart</span>
        </Link>
        <Link href="/profile" className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">account_circle</span>
        </Link>
      </div>
    </header>
  );
}
