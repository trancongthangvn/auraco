import { Suspense } from "react";
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
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const value = collection.toUpperCase();

  const [apiProducts, apiCollections] = await Promise.all([
    serverApiFetch<ApiProduct[]>("/api/products"),
    serverApiFetch<ApiCollection[]>("/api/collections"),
  ]);

  const products: FullProduct[] = apiProducts.map(toFullProduct);
  const collectionFilters: CollectionFilter[] = toCollectionFilters(apiCollections);
  const match = collectionFilters.find((c) => c.value === value);

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <Suspense>
          <CatalogClient
            products={products}
            collectionFilters={collectionFilters}
            initialCollection={value}
            heading={match?.label.toUpperCase() ?? collection.replace(/-/g, " ")}
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
