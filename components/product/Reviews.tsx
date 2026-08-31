import type { FullProduct } from "@/data/products";
import { serverApiFetch } from "@/lib/server-api";
import ReviewsClient, { type ProductReview } from "./ReviewsClient";

/**
 * Every figure below is measured off auracojewelry.com at viewport 1256: the
 * head is a 1fr/2fr grid, and both the summary and each review are the same
 * 14px-radius white card with a gold-light/35 hairline.
 */
export default async function Reviews({ product }: { product: FullProduct }) {
  const reviews = await serverApiFetch<ProductReview[]>(
    `/api/products/${product.slug}/reviews`
  ).catch(() => [] as ProductReview[]);

  return (
    <section className="mx-auto px-4 mt-12 pt-6 border-t border-gold-light/35">
      <h2 className="font-serif-display text-[22px] leading-[24.2px] text-[#28241f] mt-6 mb-[9.6px]">
        Reviews
      </h2>
      <ReviewsClient
        slug={product.slug}
        productName={product.name}
        initialReviews={reviews}
      />
    </section>
  );
}
