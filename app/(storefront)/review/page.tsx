import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReviewFormClient from "@/components/review/ReviewFormClient";
import { serverApiFetch } from "@/lib/server-api";
import type { ApiProduct } from "@/lib/catalog-mappers";

export const metadata = {
  title: "Write a review | AURA & CO",
  // Nothing here should be indexed: the page only makes sense reached from
  // a specific order's confirmation screen, and its URL carries an order
  // code.
  robots: { index: false, follow: false },
};

type PurchaseContext = { order_code: string; purchased_at: string };

export default async function WriteReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; order?: string }>;
}) {
  // ?product= and ?order= are read server-side and passed down as props
  // rather than with useSearchParams() — that hook forces a Suspense
  // boundary which has shipped blank pages in this codebase before (see
  // DEPLOYMENT.md).
  const { product: productSlug, order: orderCode } = await searchParams;

  const product = productSlug
    ? await serverApiFetch<ApiProduct>(
        `/api/products/${encodeURIComponent(productSlug)}`
      ).catch(() => null)
    : null;

  // Confirms the order really did buy this product, and when — that is the
  // whole basis for the "Verified purchase" label. Returns no personal
  // data (see GET /orders/:code/purchase server-side).
  const purchase =
    orderCode && productSlug
      ? await serverApiFetch<PurchaseContext>(
          `/api/orders/${encodeURIComponent(orderCode)}/purchase?product=${encodeURIComponent(
            productSlug
          )}`
        ).catch(() => null)
      : null;

  return (
    <>
      <Announcement />
      <Header />
      <ReviewFormClient
        product={
          product
            ? {
                slug: product.slug,
                name: product.name,
                image: product.images?.[0] ?? null,
                collection: product.collections?.[0] ?? product.category ?? null,
              }
            : null
        }
        orderCode={purchase?.order_code ?? null}
        purchasedAt={purchase?.purchased_at ?? null}
      />
      <Footer />
    </>
  );
}
