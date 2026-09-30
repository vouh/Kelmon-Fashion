import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
} from "next/constants";

/**
 * Supabase Storage public URLs look like:
 *   https://<project-ref>.supabase.co/storage/v1/object/public/product-images/...
 * so the hostname is derived from NEXT_PUBLIC_SUPABASE_URL rather than hardcoded.
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const createNextConfig = (phase: string): NextConfig => ({
  images: {
    remotePatterns: [
      // Preset avatar artwork in lib/avatars.ts.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Google account avatars, for profiles created via Google sign-in.
      { protocol: "https", hostname: "*.googleusercontent.com" },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  // Hide the Next.js "N" / DevTools bubble in the corner
  devIndicators: false,
  // Keep production output away from the development cache. Running
  // `next build` while `next dev` is open would otherwise replace the live
  // CSS/chunk manifest and leave pages rendering as unstyled HTML.
  // Vercel only collects the default .next folder, so builds there must use it.
  distDir:
    process.env.NEXT_BUILD_DIR ||
    (phase === PHASE_DEVELOPMENT_SERVER || process.env.VERCEL ? ".next" : ".next-build"),
  // The site opens on the shop; the editorial home page lives at /home.
  // Sign-in is a modal now, so old /signin links open it over the shop
  // (query params such as ?next= pass through).
  async redirects() {
    return [
      { source: "/", destination: "/shop", permanent: false },
      { source: "/signin", destination: "/shop?auth=signin", permanent: false },
    ];
  },
});

export default createNextConfig;
