import ShopClient from "@/components/shop/ShopClient";

interface ShopPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  return (
    <ShopClient
      initialQuery={params.q ?? ""}
      initialCategory={params.category ?? "All"}
    />
  );
}
