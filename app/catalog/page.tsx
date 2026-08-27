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

export const metadata = {
  title: "Catalog | AURA & CO",
};

export default async function CatalogPage() {
  const [apiProducts, apiCollections] = await Promise.all([
    serverApiFetch<ApiProduct[]>("/api/products"),
    serverApiFetch<ApiCollection[]>("/api/collections"),
  ]);

  const products: FullProduct[] = apiProducts.map(toFullProduct);
  const collectionFilters: CollectionFilter[] = toCollectionFilters(apiCollections);

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <Suspense>
          <CatalogClient
            products={products}
            collectionFilters={collectionFilters}
            heading="PRODUCTS"
            subheading="Browse gold vermeil and sterling silver pieces, from everyday staples to statement designs."
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
