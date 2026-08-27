import type { FullProduct } from "@/data/products";
import { StarIcon, StarRating } from "@/components/icons";

const sampleReviews = [
  {
    name: "Grace",
    date: "Aug 4, 2026",
    rating: 5,
    text: "Beautiful piece and great quality! Shipping took just a little longer than expected, but overall very happy with my purchase.",
  },
  {
    name: "Julia James",
    date: "Aug 2, 2026",
    rating: 4,
    text: "Beautiful minimalist piece with a lovely shine. I only wish the chain was a tiny bit longer, but overall I'm very happy.",
  },
  {
    name: "Abbie Bennett",
    date: "Jul 26, 2026",
    rating: 5,
    text: "Even prettier in person! The polished finish gives it such a chic and elegant look.",
  },
  {
    name: "Alice Gray",
    date: "Jun 29, 2026",
    rating: 4,
    text: "I love how simple and timeless this design is. Goes with every outfit.",
  },
];

export default function Reviews({ product }: { product: FullProduct }) {
  if (product.reviewCount === 0) {
    return (
      <section className="mx-auto max-w-[1400px] px-6 py-16 border-t border-black/10">
        <h2 className="font-serif-display text-2xl mb-4">Customer Reviews</h2>
        <p className="text-sm text-black/50">
          No reviews yet. Be the first to review {product.name}.
        </p>
      </section>
    );
  }

  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: sampleReviews.filter((r) => r.rating === star).length,
  }));

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16 border-t border-black/10">
      <h2 className="font-serif-display text-2xl mb-6">Customer Reviews</h2>

      <div className="flex flex-col sm:flex-row gap-10 mb-10">
        <div>
          <p className="text-4xl mb-1">{product.rating.toFixed(1)}</p>
          <p className="text-xs text-black/50">
            Based on {product.reviewCount} reviews
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
                    width: `${(b.count / sampleReviews.length) * 100}%`,
                  }}
                />
              </div>
              <span className="w-4 text-right">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {sampleReviews.slice(0, product.reviewCount).map((r) => (
          <div key={r.name} className="border-t border-black/10 pt-4">
            <p className="mb-1">
              <StarRating rating={r.rating} size={12} />
            </p>
            <p className="text-sm font-medium">
              {r.name} <span className="text-black/40 font-normal">· {r.date}</span>
            </p>
            <p className="text-sm text-black/70 mt-2 leading-relaxed">
              {r.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
