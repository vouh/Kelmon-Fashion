import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/supabase/products";
import { getFilterCategories } from "@/lib/supabase/categories";
import { SITE_URL } from "@/lib/seo";

/** Rebuilt at most hourly, so new products show up for crawlers without a deploy. */
export const revalidate = 3600;

function absolute(src: string): string | null {
  if (!src || src === "/logo.png") return null;
  return src.startsWith("http") ? src : `${SITE_URL}${src}`;
}

/**
 * Every public page, each shop category, and a URL per in-stock product with
 * its photos (so they can appear in Google Images). Private pages (cart,
 * checkout, account, admin) are left out and blocked in robots.ts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [products, categories] = await Promise.all([getProducts(), getFilterCategories()]);

  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/home`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((c) => c && c !== "All")
    .map((category) => ({
      url: `${SITE_URL}/shop?category=${encodeURIComponent(category)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => {
    const images = (product.images?.length ? product.images : [product.image])
      .map(absolute)
      .filter((src): src is string => Boolean(src));
    return {
      url: `${SITE_URL}/product/${product.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
      ...(images.length ? { images } : {}),
    };
  });

  return [...pages, ...categoryPages, ...productPages];
}
