import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import { getProductById } from "@/lib/supabase/products";
import { formatKes } from "@/lib/products";
import { SITE_NAME, SITE_URL, pageMetadata } from "@/lib/seo";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

/** A photo URL safe to hand to crawlers: absolute, and never the local placeholder. */
function absoluteImage(src: string | undefined): string | undefined {
  if (!src || src === "/logo.png") return undefined;
  return src.startsWith("http") ? src : `${SITE_URL}${src}`;
}

function summary(text: string | undefined, fallback: string): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 155 ? `${clean.slice(0, 152).trimEnd()}…` : clean;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Product not found", robots: { index: false } };

  const price = formatKes(product.price);
  return pageMetadata({
    title: `${product.name} — ${price}`,
    description: summary(
      product.description,
      `Buy ${product.name} (${product.category}) at Kelmon for ${price}. Pay with M-Pesa, free delivery.`
    ),
    path: `/product/${product.id}`,
    image: absoluteImage(product.image),
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const url = `${SITE_URL}/product/${product.id}`;
  const images = (product.images?.length ? product.images : [product.image])
    .map(absoluteImage)
    .filter((src): src is string => Boolean(src));

  // Lets Google show price, availability and rating in search results.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: summary(product.description, `${product.name} from Kelmon.`),
    sku: product.id,
    category: product.category,
    ...(images.length ? { image: images } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "KES",
      price: product.price,
      availability:
        (product.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${SITE_URL}/#organization` },
      areaServed: "KE",
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shop", item: `${SITE_URL}/shop` },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category,
        item: `${SITE_URL}/shop?category=${encodeURIComponent(product.category)}`,
      },
      { "@type": "ListItem", position: 3, name: product.name, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // "<" is escaped so product text can never close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([structuredData, breadcrumbs]).replace(/</g, "\\u003c"),
        }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
