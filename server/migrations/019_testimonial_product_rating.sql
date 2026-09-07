-- ============================================================================
-- 019 — Testimonials gain an optional product link + a star rating
--
-- The homepage "Đánh giá khách hàng" (testimonials) admin screen only ever
-- captured name/quote/photo. Explicit request: let the admin optionally tie
-- a testimonial to one real product (for admin-side search/filter), and give
-- it a 1-5 star rating that now also renders on the public homepage card
-- (components/Testimonials.tsx's Stars, previously hardcoded to 5).
--
-- product_id is nullable + ON DELETE SET NULL: linking a product is opt-in
-- (a testimonial can be a general store review with no product), and
-- deleting a product must not delete or break testimonials that reference
-- it — product_name is stored as a snapshot alongside it (same pattern as
-- product_reviews.product_name) so the admin list/search keeps showing the
-- product's name even if the product is later renamed or removed.
--
-- rating defaults to 5 so the 34 existing rows (all effectively 5-star praise
-- already) don't regress the newly-wired public star display.
--
-- Safe to re-run: IF NOT EXISTS / guarded DO block.
-- ============================================================================

ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS product_name VARCHAR(200);
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS rating SMALLINT NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'testimonials_rating_check'
  ) THEN
    ALTER TABLE testimonials ADD CONSTRAINT testimonials_rating_check CHECK (rating >= 1 AND rating <= 5);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_testimonials_product ON testimonials(product_id);
