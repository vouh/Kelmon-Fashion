import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

/** Lets phones "Add to Home Screen" with the Kelmon icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Beauty · Fashion · Glamour`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/shop",
    scope: "/",
    display: "standalone",
    background_color: "#faf6fc",
    theme_color: "#8E44AD",
    categories: ["shopping", "lifestyle", "beauty"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
