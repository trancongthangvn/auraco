import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogClient, {
  type CollectionFilter,
} from "@/components/catalog/CatalogClient";
import type { FullProduct } from "@/data/products";
import { serverApiFetch } from "@/lib/server-api";
import {
  toFullProduct,
  toCollectionFilters,
  type ApiProduct,
  type ApiCollection,
} from "@/lib/catalog-mappers";

export const metadata = { title: "Products | AURA & CO" };

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; q?: string }>;
}) {
  // Query string read here, not via useSearchParams() in CatalogClient — see
  // app/(storefront)/catalog/page.tsx for why that boundary had to go.
  //
  // Was rendering from the static `data/products` import — a frozen
  // snapshot from before the real backend existed, completely disconnected
  // from the admin catalog and from products.sort_order. Fetching live like
  // every other catalog route does is what makes the reference-matched
  // ordering (see migration 009) actually show up here.
  const [{ brand, q }, apiProducts, apiCollections] = await Promise.all([
    searchParams,
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
        <CatalogClient
          products={products}
          collectionFilters={collectionFilters}
          heading="ALL PRODUCTS"
          subheading="Every piece, in one place."
          brandParam={brand}
          queryParam={q}
        />
      </main>
      <Footer />
    </>
  );
}
