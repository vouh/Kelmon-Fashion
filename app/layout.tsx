import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Cormorant_Garamond } from "next/font/google";
import AppProviders from "@/components/providers/AppProviders";
import PwaRegister from "@/components/providers/PwaRegister";
import "@/styles/design.css";
import "./globals.css";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  SOCIAL,
} from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-cormorant",
});

/**
 * Site-wide defaults. Pages set `title` (the template appends "| Kelmon"),
 * `description` and a canonical path via pageMetadata() in lib/seo.ts.
 * Icons come from app/favicon.ico, app/icon.png and app/apple-icon.png, and
 * the share image from app/opengraph-image.png, by Next.js file convention.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE} | Fashion & Perfumes in Kenya`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  // No site-wide canonical: it would be inherited by every page that doesn't
  // set its own. Public pages set theirs through pageMetadata().
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_KE",
    url: "/",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#8E44AD" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1028" },
  ],
};

/** Tells search engines who Kelmon is and that /shop?q= searches the store. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "OnlineStore"],
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      slogan: SITE_TAGLINE,
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512.png`,
      image: `${SITE_URL}/opengraph-image.png`,
      description: SITE_DESCRIPTION,
      areaServed: { "@type": "Country", name: "Kenya" },
      currenciesAccepted: "KES",
      paymentAccepted: "M-Pesa, Cash on delivery",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: "+254787216442",
        areaServed: "KE",
        availableLanguage: ["English", "Swahili"],
      },
      sameAs: [SOCIAL.whatsapp],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "en-KE",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/shop?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('kelmon-theme');
    var d = t || 'light';
    document.documentElement.classList.add(d);
  } catch (e) {
    document.documentElement.classList.add('light');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* One weight plus the FILL axis keeps the file small. display=block hides
            ligature names like "shopping_bag" until the glyphs arrive. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${cormorant.variable} kelmon-theme antialiased min-h-screen flex flex-col font-body-md text-body-md`}>
        <AppProviders>{children}</AppProviders>
        <PwaRegister />
      </body>
    </html>
  );
}
