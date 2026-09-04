-- ============================================================================
-- 015 — Product review photos
--
-- Mirrors 008_testimonial_photos.sql: product reviews had no photo column,
-- so a customer's own product photo could never be shown alongside their
-- review. This adds a nullable photo_url a review can optionally carry.
--
-- Nullable — most reviews will have no photo, and the frontend only renders
-- a thumbnail when the column is set.
--
-- Safe to re-run: IF NOT EXISTS.
-- ============================================================================

ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS photo_url TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'product_reviews' AND column_name = 'photo_url'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN product_reviews.photo_url IS ''Optional customer-submitted product photo. NULL when the review has no photo.''';
  END IF;
END $$;
