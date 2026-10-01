import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/supabase/products";
import { getFilterCategories } from "@/lib/supabase/categories";
import type { Product } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";

/** Rebuilt at most hourly, so new products show up for crawlers without a deploy. */
export const revalidate = 3600;

function absolute(src: string): string | null {
  if (!src || src === "/logo.png") return null;
  return src.startsWith("http") ? src : `${SITE_URL}${src}`;
}

/** The most recent edit among these products; undefined when there are none. */
function latest(products: Product[]): Date | undefined {
  const times = products.map((p) => (p.updatedAt ? Date.parse(p.updatedAt) : NaN)).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)) : undefined;
}

/**
 * Every public page, each shop category that has something in stock, and a
 * URL per in-stock product with its photos (so they can appear in Google
 * Images). Private pages (cart, checkout, account, admin) are left out and
 * blocked in robots.ts.
 *
 * lastmod is only given where it's real: a product's last edit, and for the
 * shop and its categories the newest edit among their products. Google stops
 * trusting lastmod on a site that always reports "now", so the static pages
 * have none.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getFilterCategories()]);
  const shopUpdated = latest(products);

  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/shop`, lastModified: shopUpdated, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/home`, lastModified: shopUpdated, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // An empty category page is thin content, so only list ones with stock.
  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((c) => c && c !== "All")
    .map((category) => ({
      category,
      items: products.filter((p) => p.category.trim().toLowerCase() === category.trim().toLowerCase()),
    }))
    .filter(({ items }) => items.length > 0)
    .map(({ category, items }) => ({
      url: `${SITE_URL}/shop?category=${encodeURIComponent(category)}`,
      lastModified: latest(items),
      changeFrequency: "daily",
      priority: 0.8,
    }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => {
    const images = (product.images?.length ? product.images : [product.image])
      .map(absolute)
      .filter((src): src is string => Boolean(src));
    return {
      url: `${SITE_URL}/product/${product.id}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
      changeFrequency: "weekly",
      priority: 0.7,
      ...(images.length ? { images } : {}),
    };
  });

  return [...pages, ...categoryPages, ...productPages];
}
