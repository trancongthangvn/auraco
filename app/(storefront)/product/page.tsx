import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogClient from "@/components/catalog/CatalogClient";
import { products } from "@/data/products";

export const metadata = { title: "Products | AURA & CO" };

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; q?: string }>;
}) {
  // Query string read here, not via useSearchParams() in CatalogClient — see
  // app/(storefront)/catalog/page.tsx for why that boundary had to go.
  const { brand, q } = await searchParams;

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <CatalogClient
          products={products}
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
