import type { NextConfig } from "next";

/**
 * Supabase Storage public URLs look like:
 *   https://<project-ref>.supabase.co/storage/v1/object/public/product-images/...
 * so the hostname is derived from NEXT_PUBLIC_SUPABASE_URL rather than hardcoded.
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
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
  // Lets a production build run beside `next dev` without clobbering its .next
  // folder (NEXT_BUILD_DIR=.next-build npm run build). Unset on Vercel.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  // The site opens on the shop; the editorial home page lives at /home.
  // Sign-in is a modal now, so old /signin links open it over the shop
  // (query params such as ?next= pass through).
  async redirects() {
    return [
      { source: "/", destination: "/shop", permanent: false },
      { source: "/signin", destination: "/shop?auth=signin", permanent: false },
    ];
  },
};

export default nextConfig;
