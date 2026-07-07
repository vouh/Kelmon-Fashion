import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import { getProductById } from "@/lib/products";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
