"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAuthModal } from "@/components/auth/AuthModal";

/**
 * A link to an account-only page (profile, orders). Signed out, it opens the
 * sign-in modal over the current page instead of navigating to a page that
 * would only say "sign in"; after signing in the user continues to `href`.
 */
export default function AccountLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { openAuth } = useAuthModal();

  if (!loading && !user) {
    return (
      <button type="button" onClick={() => openAuth({ next: href })} className={className}>
        {children}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
