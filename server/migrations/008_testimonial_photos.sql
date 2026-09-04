-- ============================================================================
-- 008 — Testimonial photos
--
-- The homepage FEEDBACK cards had no photo column at all: each card just
-- borrowed one of a handful of on-model shots by array position
-- (TESTIMONIAL_PHOTOS[i % N] in app/(storefront)/page.tsx), so the picture
-- next to "Maria Evans" had nothing to do with Maria Evans and shifted
-- whenever a testimonial was added/removed/reordered. This gives every
-- testimonial its own real photo.
--
-- Nullable, with the borrowed-photo fallback kept in the frontend for any
-- existing row an admin hasn't set a real photo for yet.
--
-- Safe to re-run: IF NOT EXISTS.
-- ============================================================================

ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS photo_url TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'testimonials' AND column_name = 'photo_url'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN testimonials.photo_url IS ''This reviewer''''s own photo. NULL falls back to a borrowed on-model shot in the frontend.''';
  END IF;
END $$;
