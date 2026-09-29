import type { Metadata } from "next";

/**
 * Site-wide SEO settings. NEXT_PUBLIC_SITE_URL must be the real production
 * origin in the deployed environment: canonical links, the sitemap and social
 * previews are all built from it.
 */
/** The live store. Links in emails sent from production always point here. */
export const PRODUCTION_SITE_URL = "https://www.kelmonfashion.com";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_SITE_URL).replace(/\/+$/, "");
export const SITE_NAME = "Kelmon";
export const SITE_TAGLINE = "Beauty · Fashion · Glamour";
export const SITE_DESCRIPTION =
  "Shop designer-inspired bags, perfumes, colognes and accessories at Kelmon. Campus fashion and beauty for Kenyan students, with M-Pesa checkout and free delivery over KES 3,000.";

export const SITE_KEYWORDS = [
  "Kelmon",
  "fashion Kenya",
  "perfumes Kenya",
  "men's cologne Kenya",
  "ladies perfume Nairobi",
  "handbags Kenya",
  "accessories Nairobi",
  "campus fashion",
  "University of Nairobi fashion",
  "student fashion Kenya",
  "beauty products Kenya",
  "online shopping Kenya",
  "M-Pesa shopping",
];

/** app/opengraph-image.png, served at this path by Next.js. */
export const DEFAULT_SHARE_IMAGE = "/opengraph-image.png";

export const SOCIAL = {
  whatsapp: "https://wa.me/254794640214",
};

/**
 * Per-page metadata with the canonical URL and matching Open Graph / Twitter
 * fields filled in, so every page previews properly when shared.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  noIndex,
}: {
  title: string;
  description: string;
  /** Path from the site root, e.g. "/shop". */
  path: string;
  /** Absolute or root-relative image; defaults to the site's share image. */
  image?: string;
  noIndex?: boolean;
}): Metadata {
  // A page's openGraph replaces the layout's wholesale, so the default share
  // image has to be restated here or pages would share with no picture.
  const shareImage = image ?? DEFAULT_SHARE_IMAGE;
  const images = [{ url: shareImage, alt: image ? title : `${SITE_NAME} — ${SITE_TAGLINE}` }];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      images,
    },
    twitter: {
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [shareImage],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Pages that should never appear in search results (carts, accounts, auth). */
export const PRIVATE_PAGE: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
