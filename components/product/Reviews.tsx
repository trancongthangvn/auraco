import type { FullProduct } from "@/data/products";
import { StarIcon, StarRating } from "@/components/icons";
import { serverApiFetch } from "@/lib/server-api";

type ProductReview = {
  id: number;
  product_id: number;
  product_name: string;
  customer_name: string;
  rating: number;
  comment: string;
  status: string;
  created_at: string;
};

/**
 * Every figure below is measured off auracojewelry.com at viewport 1256: the
 * head is a 1fr/2fr grid, and both the summary and each review are the same
 * 14px-radius white card with a gold-light/35 hairline.
 */
export default async function Reviews({ product }: { product: FullProduct }) {
  const reviews = await serverApiFetch<ProductReview[]>(
    `/api/products/${product.slug}/reviews`
  ).catch(() => [] as ProductReview[]);

  const sectionClass = "mx-auto px-4 mt-12 pt-6 border-t border-gold-light/35";
  const titleClass =
    "font-serif-display text-[22px] leading-[24.2px] text-[#28241f] mt-6 mb-[9.6px]";
  const cardClass =
    "rounded-[14px] border border-gold-light/35 bg-white px-[19.2px] py-[17.6px]";

  if (reviews.length === 0) {
    return (
      <section className={sectionClass}>
        <h2 className={titleClass}>Customer Reviews</h2>
        <div className={`${cardClass} text-center`}>
          <StarRating rating={0} size={16} />
          <p className="mt-[9.6px] font-ui text-xs font-light leading-[18.6px] tracking-[0.06px] text-[#4f4a44]">
            No reviews yet. Be the first to share what you think of{" "}
            {product.name}.
          </p>
        </div>
      </section>
    );
  }

  const averageRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <section className={sectionClass}>
      <div className="grid gap-5 items-start mb-6 sm:grid-cols-[1fr_2fr]">
        <h2 className={titleClass}>Customer Reviews</h2>

        <div className={cardClass}>
          <div className="flex items-baseline gap-[9.6px]">
            <span className="font-serif-display text-[30px] leading-[30px] text-[#28241f]">
              {averageRating.toFixed(1)}
            </span>
            <StarRating rating={averageRating} size={16} />
          </div>
          <p className="mt-[5.6px] mb-[13.6px] font-ui text-xs font-light leading-[18.6px] tracking-[0.24px] text-[#625d56]">
            Based on {reviews.length}{" "}
            {reviews.length === 1 ? "review" : "reviews"}
          </p>
          <div className="grid gap-[5.6px]">
            {breakdown.map((b) => (
              <div
                key={b.star}
                className="grid grid-cols-[38.4px_1fr_32px] items-center gap-2 text-[14.08px] leading-[21.824px] text-[#5c554a]"
              >
                <span className="inline-flex items-center gap-1">
                  {b.star} <StarIcon size={12} className="text-gold" />
                </span>
                <span className="h-[6px] rounded-full bg-[#f6f0e6]">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-gold-light to-gold"
                    style={{ width: `${(b.count / reviews.length) * 100}%` }}
                  />
                </span>
                <span>{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {reviews.map((r) => (
          <div key={r.id} className={cardClass}>
            <div className="flex items-start gap-3">
              <StarRating rating={r.rating} size={16} />
              <p className="text-[14.08px] leading-[21.824px] text-[#5c554a]">
                <strong className="font-bold">{r.customer_name}</strong>{" "}
                <time dateTime={r.created_at}>
                  {new Date(r.created_at).toLocaleDateString()}
                </time>
              </p>
            </div>
            <p className="mt-[9.6px] font-ui text-xs font-light leading-[18.6px] tracking-[0.06px] text-[#4f4a44]">
              {r.comment}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
