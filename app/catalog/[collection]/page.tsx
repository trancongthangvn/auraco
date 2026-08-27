import { Suspense } from "react";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogClient from "@/components/catalog/CatalogClient";
import { products, collectionFilters } from "@/data/products";

export function generateStaticParams() {
  return collectionFilters
    .filter((c) => c.value !== "ALL")
    .map((c) => ({ collection: c.value }));
}

export default async function CatalogCollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const value = collection.toUpperCase();
  const match = collectionFilters.find((c) => c.value === value);

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <Suspense>
          <CatalogClient
            products={products}
            initialCollection={value}
            heading={match?.label.toUpperCase() ?? collection.replace(/-/g, " ")}
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
