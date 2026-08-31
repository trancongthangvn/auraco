"use client";

import { useMemo, useState } from "react";
import { StarIcon, StarRating } from "@/components/icons";
import { apiFetch, ApiError } from "@/lib/api";

export type ProductReview = {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

type SortKey = "recent" | "highest" | "lowest";

export default function ReviewsClient({
  slug,
  productName,
  initialReviews,
}: {
  slug: string;
  productName: string;
  initialReviews: ProductReview[];
}) {
  // A freshly submitted review goes to "Chờ duyệt" (pending) and only
  // appears here once an admin approves it — initialReviews never changes
  // client-side, so this is a plain const, not state.
  const reviews = initialReviews;
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");

  const [writing, setWriting] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formName, setFormName] = useState("");
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const recommendCount = reviews.filter((r) => r.rating >= 4).length;
  const recommendPercent =
    reviews.length > 0 ? Math.round((recommendCount / reviews.length) * 100) : 0;

  const visibleReviews = useMemo(() => {
    let list = starFilter ? reviews.filter((r) => r.rating === starFilter) : reviews;
    list = [...list].sort((a, b) => {
      if (sort === "highest") return b.rating - a.rating;
      if (sort === "lowest") return a.rating - b.rating;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [reviews, starFilter, sort]);

  const submitReview = async () => {
    setSubmitError("");
    if (!formName.trim()) return setSubmitError("Enter your name.");
    if (formRating < 1) return setSubmitError("Select a star rating.");
    if (!formComment.trim()) return setSubmitError("Write a short review.");
    setSubmitting(true);
    try {
      await apiFetch(`/api/products/${encodeURIComponent(slug)}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          customerName: formName.trim(),
          rating: formRating,
          comment: formComment.trim(),
        }),
      });
      setSubmitted(true);
      setWriting(false);
      setFormName("");
      setFormComment("");
      setFormRating(0);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const cardClass = "rounded-[14px] border border-gold-light/35 bg-white px-[19.2px] py-[17.6px]";

  if (reviews.length === 0 && !submitted) {
    return (
      <div className={`${cardClass} text-center`}>
        <StarRating rating={0} size={16} />
        <p className="mt-[9.6px] font-ui text-xs font-light leading-[18.6px] tracking-[0.06px] text-[#4f4a44]">
          No reviews yet. Be the first to share what you think of {productName}.
        </p>
        {writing ? (
          <ReviewForm
            formRating={formRating}
            setFormRating={setFormRating}
            formName={formName}
            setFormName={setFormName}
            formComment={formComment}
            setFormComment={setFormComment}
            submitError={submitError}
            submitting={submitting}
            onSubmit={submitReview}
            onCancel={() => setWriting(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setWriting(true)}
            className="mt-3 rounded-full border border-[#2b261f] px-5 py-2 text-xs font-medium uppercase tracking-[0.08em] text-[#2b261f] transition-colors hover:bg-[#2b261f] hover:text-white"
          >
            Write a review
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-5 items-start mb-6 sm:grid-cols-[1fr_1fr]">
        <div className={cardClass}>
          <p className="mb-3 font-ui text-xs font-light leading-[18.6px] text-[#625d56]">
            See how customers rated this product. Select a row below to filter reviews.
          </p>
          <div className="grid gap-[5.6px]">
            {breakdown.map((b) => (
              <button
                key={b.star}
                type="button"
                onClick={() => setStarFilter((cur) => (cur === b.star ? null : b.star))}
                className={`grid grid-cols-[38.4px_1fr_32px] items-center gap-2 rounded px-1 py-0.5 text-left text-[14.08px] leading-[21.824px] text-[#5c554a] transition-colors hover:bg-[#f6f0e6] ${
                  starFilter === b.star ? "bg-[#f6f0e6]" : ""
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {b.star} <StarIcon size={12} className="text-gold" />
                </span>
                <span className="h-[6px] rounded-full bg-[#f6f0e6]">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-gold-light to-gold transition-[width] duration-500"
                    style={{ width: `${reviews.length ? (b.count / reviews.length) * 100 : 0}%` }}
                  />
                </span>
                <span>{b.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-baseline gap-[9.6px]">
            <span className="font-serif-display text-[30px] leading-[30px] text-[#28241f]">
              {averageRating.toFixed(1)}
            </span>
            <StarRating rating={averageRating} size={16} />
          </div>
          <p className="mt-[5.6px] font-ui text-xs font-light leading-[18.6px] tracking-[0.24px] text-[#625d56]">
            Based on {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
          {reviews.length > 0 && (
            <p className="mt-1 font-ui text-xs font-light leading-[18.6px] tracking-[0.24px] text-[#625d56]">
              {recommendCount} out of {reviews.length} ({recommendPercent}%) reviewers recommend this product
            </p>
          )}

          <div className="mt-4 border-t border-gold-light/35 pt-4">
            {writing ? (
              <ReviewForm
                formRating={formRating}
                setFormRating={setFormRating}
                formName={formName}
                setFormName={setFormName}
                formComment={formComment}
                setFormComment={setFormComment}
                submitError={submitError}
                submitting={submitting}
                onSubmit={submitReview}
                onCancel={() => setWriting(false)}
              />
            ) : submitted ? (
              <p className="font-ui text-xs font-light text-[#4f4a44]">
                Thanks! Your review was submitted and will appear once approved.
              </p>
            ) : (
              <>
                <p className="mb-2 font-ui text-xs font-semibold uppercase tracking-[0.08em] text-[#5c554a]">
                  Review this product
                </p>
                <button
                  type="button"
                  onClick={() => setWriting(true)}
                  aria-label="Write a review"
                  className="flex items-center gap-1.5 transition-transform hover:scale-105"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <StarIcon key={i} size={20} filled={false} className="text-black/25" />
                  ))}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-ui text-xs text-[#5c554a]">
            {visibleReviews.length} of {reviews.length} reviews
            {starFilter && (
              <button
                type="button"
                onClick={() => setStarFilter(null)}
                className="ml-2 underline hover:text-ink"
              >
                Clear filter
              </button>
            )}
          </p>
          <label className="flex items-center gap-2 font-ui text-xs text-[#5c554a]">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-black/10 px-2 py-1 text-xs outline-none focus:border-ink"
            >
              <option value="recent">Most Recent</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </label>
        </div>
      )}

      <div className="grid gap-4">
        {visibleReviews.map((r) => (
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
        {visibleReviews.length === 0 && (
          <p className="text-center font-ui text-xs text-black/40 italic">
            No reviews match this filter.
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewForm({
  formRating,
  setFormRating,
  formName,
  setFormName,
  formComment,
  setFormComment,
  submitError,
  submitting,
  onSubmit,
  onCancel,
}: {
  formRating: number;
  setFormRating: (n: number) => void;
  formName: string;
  setFormName: (s: string) => void;
  formComment: string;
  setFormComment: (s: string) => void;
  submitError: string;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="text-left">
      <div className="mb-3 flex items-center gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
            onClick={() => setFormRating(i + 1)}
            className="transition-transform hover:scale-110"
          >
            <StarIcon
              size={22}
              filled={i < formRating}
              className={i < formRating ? "text-gold" : "text-black/25"}
            />
          </button>
        ))}
      </div>
      <input
        value={formName}
        onChange={(e) => setFormName(e.target.value)}
        placeholder="Your name"
        disabled={submitting}
        className="mb-2 w-full border-0 border-b border-black/15 bg-transparent px-1 py-1.5 text-sm outline-none focus:border-ink"
      />
      <textarea
        value={formComment}
        onChange={(e) => setFormComment(e.target.value)}
        placeholder="Share your thoughts on this product"
        rows={3}
        disabled={submitting}
        className="mb-2 w-full border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-ink"
      />
      {submitError && <p className="mb-2 text-xs text-red-700">{submitError}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-full bg-[#2b261f] px-5 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-black disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit review"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="text-xs text-black/50 underline hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
