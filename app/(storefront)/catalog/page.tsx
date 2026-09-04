import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogClient, {
  type CollectionFilter,
} from "@/components/catalog/CatalogClient";
import type { FullProduct } from "@/data/products";
import { serverApiFetch } from "@/lib/server-api";
import { toFullProduct, toCollectionFilters, type ApiProduct, type ApiCollection, type ApiBrand } from "@/lib/catalog-mappers";
import { getServerDictionary } from "@/lib/i18n/server";

export const metadata = {
  title: "Catalog | AURA & CO",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; q?: string }>;
}) {
  // ?brand= and ?q= are read here rather than with useSearchParams() inside
  // CatalogClient. That hook forces the component into a Suspense boundary,
  // and that boundary never resolved in the browser — the catalog rendered
  // as a blank page. Passing the values down as props removes the boundary.
  const [{ brand, q }, apiProducts, apiCollections, apiBrands, { dict }] = await Promise.all([
    searchParams,
    serverApiFetch<ApiProduct[]>("/api/products"),
    serverApiFetch<ApiCollection[]>("/api/collections"),
    serverApiFetch<ApiBrand[]>("/api/brands").catch(() => [] as ApiBrand[]),
    getServerDictionary(),
  ]);

  const brandNavKey: Record<string, string> = {
    Necklaces: "necklaces",
    Bracelets: "bracelets",
    Earrings: "earrings",
    "Signature-Sets": "signatureSets",
  };

  const products: FullProduct[] = apiProducts.map(toFullProduct);
  const collectionFilters: CollectionFilter[] = toCollectionFilters(apiCollections);
  const brandDescription = brand
    ? apiBrands.find((b) => b.slug === brand)?.description ?? undefined
    : undefined;

  return (
    <>
      <Announcement />
      <Header activeNavKey={brand ? brandNavKey[brand] ?? null : "collections"} />
      <main>
        <CatalogClient
          products={products}
          collectionFilters={collectionFilters}
          heading={dict.catalog.heading}
          subheading={dict.catalog.subheading}
          brandParam={brand}
          queryParam={q}
          brandDescription={brandDescription}
        />
      </main>
      <Footer />
    </>
  );
}
