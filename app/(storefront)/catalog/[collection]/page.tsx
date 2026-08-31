import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogClient, {
  type CollectionFilter,
} from "@/components/catalog/CatalogClient";
import type { FullProduct } from "@/data/products";
import { serverApiFetch } from "@/lib/server-api";
import { toFullProduct, toCollectionFilters, type ApiProduct, type ApiCollection } from "@/lib/catalog-mappers";

export default async function CatalogCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<{ brand?: string; q?: string }>;
}) {
  // See app/(storefront)/catalog/page.tsx: the query string is read here so
  // CatalogClient does not need useSearchParams(), which would put it behind
  // a Suspense boundary that never resolved and blanked the page.
  const [{ collection }, { brand, q }, apiProducts, apiCollections] =
    await Promise.all([
      params,
      searchParams,
      serverApiFetch<ApiProduct[]>("/api/products"),
      serverApiFetch<ApiCollection[]>("/api/collections"),
    ]);

  const value = collection.toUpperCase();
  const products: FullProduct[] = apiProducts.map(toFullProduct);
  const collectionFilters: CollectionFilter[] = toCollectionFilters(apiCollections);
  const match = collectionFilters.find((c) => c.value === value);
  const heroImage = apiCollections.find(
    (c) => c.slug.toUpperCase() === value
  )?.image_url;
  const heading = match?.label.toUpperCase() ?? collection.replace(/-/g, " ");

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <CatalogClient
          products={products}
          collectionFilters={collectionFilters}
          initialCollection={value}
          heading={heading}
          brandParam={brand}
          queryParam={q}
          heroImage={heroImage ?? undefined}
        />
      </main>
      <Footer />
    </>
  );
}
