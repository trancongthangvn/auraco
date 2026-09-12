"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";

const MAX_PHOTOS = 5;
const MAX_COMMENT = 5000;
/** Matches the hint under the photo field, and the server's own per-file
 *  cap is higher (10MB, server/lib/upload.js) — this is the friendlier
 *  limit the design advertises, enforced before anything is uploaded. */
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

type ReviewProduct = {
  slug: string;
  name: string;
  image: string | null;
  collection: string | null;
};

function StarRow({
  value,
  hover,
  onSelect,
  onHover,
}: {
  value: number;
  hover: number;
  onSelect: (v: number) => void;
  onHover: (v: number) => void;
}) {
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => onHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={value === n}
          onClick={() => onSelect(n)}
          onMouseEnter={() => onHover(n)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z"
              fill={n <= shown ? "#a98545" : "none"}
              stroke={n <= shown ? "#a98545" : "#cfc4b0"}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
      {shown > 0 && (
        <span className="ml-2 font-ui text-sm font-semibold text-[#a98545]">
          {RATING_LABELS[shown]}
        </span>
      )}
    </div>
  );
}

export default function ReviewFormClient({
  product,
  orderCode,
  purchasedAt,
}: {
  product: ReviewProduct | null;
  orderCode: string | null;
  purchasedAt: string | null;
}) {
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Object URLs are owned by this component; release them when the set
  // changes or the page unmounts, otherwise the files stay alive for the
  // lifetime of the document.
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      if (photos.length + accepted.length >= MAX_PHOTOS) break;
      if (!file.type.startsWith("image/")) {
        setError("Please choose image files only (JPG, PNG or WebP).");
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError(`${file.name} is larger than 4 MB.`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;
    setPhotos((prev) => [...prev, ...accepted]);
    setPreviews((prev) => [
      ...prev,
      ...accepted.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  async function handleSubmit() {
    if (!product) return;
    setError("");
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    if (!comment.trim()) {
      setError("Please write a few words about the product.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("rating", String(rating));
      formData.append("comment", comment.trim());
      if (title.trim()) formData.append("title", title.trim());
      // The order code is what makes this a verified purchase, and is also
      // where the server takes the customer's name from — the design has
      // no name field because the customer already gave it when ordering.
      if (orderCode) formData.append("orderCode", orderCode);
      photos.forEach((file) => formData.append("photos", file));

      await apiFetch(
        `/api/products/${encodeURIComponent(product.slug)}/reviews`,
        { method: "POST", body: formData }
      );
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not submit your review."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-6 py-20 text-center">
        <h1 className="font-serif-display text-[32px] text-[#28241f]">
          Review not available
        </h1>
        <p className="mt-3 font-ui text-sm text-[#6b655c]">
          We couldn&apos;t find the product this review link points to.
        </p>
        <Link
          href="/catalog"
          className="mt-8 inline-block border border-[#28241f] px-8 py-3 font-ui text-sm uppercase tracking-[0.08em] text-[#28241f] transition-colors hover:bg-[#28241f] hover:text-white"
        >
          Continue shopping
        </Link>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-6 py-20 text-center">
        <p className="font-ui text-xs uppercase tracking-[0.18em] text-[#a98545]">
          Thank you
        </p>
        <h1 className="mt-3 font-serif-display text-[34px] leading-tight text-[#28241f]">
          Your review has been submitted
        </h1>
        <p className="mx-auto mt-3 max-w-[520px] font-ui text-sm text-[#6b655c]">
          It will appear on {product.name} once our team has reviewed it.
          Thank you for helping other customers shop with confidence.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/product/${product.slug}`}
            className="border border-[#28241f] px-8 py-3 font-ui text-sm uppercase tracking-[0.08em] text-[#28241f] transition-colors hover:bg-[#28241f] hover:text-white"
          >
            Back to product
          </Link>
          <Link
            href="/catalog"
            className="bg-[#111] px-8 py-3 font-ui text-sm uppercase tracking-[0.08em] text-white transition-colors hover:bg-black"
          >
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 pt-10 pb-20">
      <div className="text-center">
        {orderCode && (
          <p className="font-ui text-xs uppercase tracking-[0.18em] text-[#a98545]">
            Verified purchase
          </p>
        )}
        <h1 className="mt-2 font-serif-display text-[40px] leading-tight text-[#28241f]">
          Write a review
        </h1>
        <p className="mt-2 font-ui text-sm text-[#6b655c]">
          Help other customers by sharing an honest review of your purchase.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
        {/* Product card */}
        <aside className="h-fit overflow-hidden rounded-[12px] border border-gold-light/45 bg-white">
          {product.image && (
            <div className="relative aspect-square w-full bg-[#faf6f0]">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
          )}
          <div className="px-5 py-5">
            {product.collection && (
              <p className="font-ui text-[11px] uppercase tracking-[0.14em] text-[#a98545]">
                {product.collection.replace(/-/g, " ")}
              </p>
            )}
            <h2 className="mt-2 font-serif-display text-[22px] leading-tight text-[#28241f]">
              {product.name}
            </h2>
            {(orderCode || purchasedAt) && (
              <dl className="mt-4 space-y-2 border-t border-gold-light/45 pt-4 font-ui text-[12px]">
                {orderCode && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="uppercase tracking-[0.1em] text-[#8a8279]">
                      Order
                    </dt>
                    <dd className="font-semibold text-[#28241f]">{orderCode}</dd>
                  </div>
                )}
                {purchasedAt && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="uppercase tracking-[0.1em] text-[#8a8279]">
                      Purchased
                    </dt>
                    <dd className="font-semibold text-[#28241f]">
                      {new Date(purchasedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </aside>

        {/* Form */}
        <section className="overflow-hidden rounded-[12px] border border-gold-light/45 bg-[#fffdfa]">
          <div className="border-b border-gold-light/45 px-6 py-6">
            <h3 className="font-serif-display text-[24px] text-[#28241f]">
              How would you rate this product?
            </h3>
            <p className="mt-1 font-ui text-sm text-[#6b655c]">
              Select a star rating.
            </p>
            <div className="mt-3">
              <StarRow
                value={rating}
                hover={hoverRating}
                onSelect={setRating}
                onHover={setHoverRating}
              />
            </div>
          </div>

          <div className="space-y-5 border-b border-gold-light/45 px-6 py-6">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label
                  htmlFor="review-title"
                  className="font-ui text-sm font-semibold text-[#28241f]"
                >
                  Review title
                </label>
                <span className="font-ui text-xs text-[#8a8279]">(optional)</span>
              </div>
              <input
                id="review-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="What stood out most?"
                className="mt-2 w-full rounded-[8px] border border-gold-light/60 bg-white px-4 py-3 font-ui text-sm text-[#28241f] outline-none placeholder:text-[#a9a196] focus:border-[#8a7a5c]"
              />
            </div>

            <div>
              <label
                htmlFor="review-body"
                className="font-ui text-sm font-semibold text-[#28241f]"
              >
                Your review
              </label>
              <textarea
                id="review-body"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                rows={7}
                placeholder="Tell us about the quality, look, fit, or anything else that may help another customer."
                className="mt-2 w-full resize-y rounded-[8px] border border-gold-light/60 bg-white px-4 py-3 font-ui text-sm leading-relaxed text-[#28241f] outline-none placeholder:text-[#a9a196] focus:border-[#8a7a5c]"
              />
              <div className="mt-1 flex items-baseline justify-between font-ui text-xs text-[#8a8279]">
                <span>Be specific and respectful.</span>
                <span>
                  {comment.length}/{MAX_COMMENT}
                </span>
              </div>
            </div>
          </div>

          <div className="border-b border-gold-light/45 px-6 py-6">
            <p className="font-ui text-sm font-semibold text-[#28241f]">
              Add photos (optional)
            </p>
            <p className="mt-1 font-ui text-sm text-[#6b655c]">
              Up to {MAX_PHOTOS} JPG, PNG or WebP images, 4 MB each.
            </p>

            {photos.length < MAX_PHOTOS && (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addPhotos(e.dataTransfer.files);
                }}
                className={`mt-3 block cursor-pointer rounded-[8px] border border-dashed px-4 py-6 text-center transition-colors ${
                  dragging
                    ? "border-[#8a7a5c] bg-[#f2e9db]"
                    : "border-gold-light/70 bg-[#faf3e9] hover:bg-[#f5ecdf]"
                }`}
              >
                <span className="block font-ui text-sm font-semibold text-[#28241f]">
                  Add photos to your review
                </span>
                <span className="mt-1 block font-ui text-xs text-[#6b655c]">
                  Drag and drop or click to browse
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}

            {previews.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-3">
                {previews.map((url, i) => (
                  <li key={url} className="relative">
                    {/* Plain <img>: a local object: URL the image optimizer
                        can't fetch. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Review photo ${i + 1}`}
                      className="h-[96px] w-[96px] rounded-[8px] border border-gold-light/45 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-gold-light/60 bg-white text-sm leading-none text-[#28241f] shadow-sm hover:bg-[#28241f] hover:text-white"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-6 py-6">
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-[8px] border border-red-300 bg-red-50 px-4 py-3 font-ui text-sm text-red-700"
              >
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="font-ui text-sm text-[#6b655c] underline underline-offset-4 hover:text-[#28241f]"
              >
                Cancel
              </button>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-4 w-full rounded-full border border-[#28241f] py-4 font-ui text-sm uppercase tracking-[0.08em] text-[#28241f] transition-colors hover:bg-[#28241f] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#28241f]"
            >
              {submitting ? "SUBMITTING..." : "SUBMIT REVIEW"}
            </button>
            <p className="mt-3 text-center font-ui text-xs text-[#8a8279]">
              Reviews are published after a quick check by our team.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
