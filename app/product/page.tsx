import { Suspense } from "react";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogClient from "@/components/catalog/CatalogClient";
import { products } from "@/data/products";

export const metadata = { title: "Products | AURA & CO" };

export default function AllProductsPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <Suspense>
          <CatalogClient
            products={products}
            heading="ALL PRODUCTS"
            subheading="Every piece, in one place."
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
