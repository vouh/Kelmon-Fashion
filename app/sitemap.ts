import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/supabase/products";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelmon.co.ke";

/** Static pages plus a URL per active product, pulled from Supabase. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/shop", "/salon", "/about", "/contact"].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const products = await getProducts();
  const productRoutes = products.map((product) => ({
    url: `${siteUrl}/product/${product.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes];
}
