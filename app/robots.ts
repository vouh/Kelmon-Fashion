import type { MetadataRoute } from "next";

/**
 * Replaces the static robots.txt, which still advertised EzyBite's Netlify
 * sitemap. Set NEXT_PUBLIC_SITE_URL in production so the sitemap link is right.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelmon.co.ke";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/auth", "/signin", "/checkout", "/orders", "/profile"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
