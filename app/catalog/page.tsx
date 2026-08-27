import { Suspense } from "react";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogClient from "@/components/catalog/CatalogClient";
import { products } from "@/data/products";

export const metadata = {
  title: "Catalog | AURA & CO",
};

export default function CatalogPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <Suspense>
          <CatalogClient
            products={products}
            heading="PRODUCTS"
            subheading="Browse gold vermeil and sterling silver pieces, from everyday staples to statement designs."
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
