import Link from "next/link";

export default function Footer() {
  return (
    <footer className="hidden md:block w-full py-lg px-margin-desktop bg-surface-container-lowest mt-auto border-t border-secondary/30">
      <div className="flex justify-between items-center">
        <p className="font-body-md text-body-md text-secondary">
          © 2026 Kelmon Marketplace. Elevating Campus Style.
        </p>
        <div className="flex gap-6">
          {["Privacy Policy", "Terms of Service", "Help Center", "Contact Us"].map((link) => (
            <Link
              key={link}
              href="#"
              className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary underline opacity-80 hover:opacity-100 uppercase tracking-widest"
            >
              {link}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
