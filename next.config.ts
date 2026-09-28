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
};

export default nextConfig;
