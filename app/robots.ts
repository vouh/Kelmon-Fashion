import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Replaces the static robots.txt, which still advertised EzyBite's Netlify
 * sitemap. Set NEXT_PUBLIC_SITE_URL in production so the sitemap link is right.
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/auth",
          "/signin",
          "/cart",
          "/checkout",
          "/orders",
          "/profile",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
