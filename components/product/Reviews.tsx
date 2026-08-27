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

export default async function Reviews({ product }: { product: FullProduct }) {
  const reviews = await serverApiFetch<ProductReview[]>(
    `/api/products/${product.slug}/reviews`
  ).catch(() => [] as ProductReview[]);

  if (reviews.length === 0) {
    return (
      <section className="mx-auto max-w-[1400px] px-6 py-16 border-t border-black/10">
        <h2 className="font-serif-display text-2xl mb-4">Customer Reviews</h2>
        <p className="text-sm text-black/50">
          No reviews yet. Be the first to review {product.name}.
        </p>
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
    <section className="mx-auto max-w-[1400px] px-6 py-16 border-t border-black/10">
      <h2 className="font-serif-display text-2xl mb-6">Customer Reviews</h2>

      <div className="flex flex-col sm:flex-row gap-10 mb-10">
        <div>
          <p className="text-4xl mb-1">{averageRating.toFixed(1)}</p>
          <p className="text-xs text-black/50">
            Based on {reviews.length} reviews
          </p>
        </div>
        <div className="flex-1 space-y-1">
          {breakdown.map((b) => (
            <div key={b.star} className="flex items-center gap-3 text-xs">
              <span className="w-10 inline-flex items-center gap-1">
                {b.star} <StarIcon size={11} />
              </span>
              <div className="flex-1 h-1.5 bg-black/10">
                <div
                  className="h-full bg-gold"
                  style={{
                    width: `${(b.count / reviews.length) * 100}%`,
                  }}
                />
              </div>
              <span className="w-4 text-right">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {reviews.map((r) => (
          <div key={r.id} className="border-t border-black/10 pt-4">
            <p className="mb-1">
              <StarRating rating={r.rating} size={12} />
            </p>
            <p className="text-sm font-medium">
              {r.customer_name}{" "}
              <span className="text-black/40 font-normal">
                · {new Date(r.created_at).toLocaleDateString()}
              </span>
            </p>
            <p className="text-sm text-black/70 mt-2 leading-relaxed">
              {r.comment}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
