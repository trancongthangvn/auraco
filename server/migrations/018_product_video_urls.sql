-- ============================================================================
-- 018 — Multiple product videos
--
-- The admin could only ever attach ONE video per product (products.video_url).
-- Explicit request: allow several. Adds video_urls, an ordered JSONB array of
-- video paths/URLs, alongside the existing video_url column rather than
-- replacing it.
--
-- video_url is kept in sync as video_urls[0] (or NULL when the array is
-- empty) by the application layer on every write, specifically so every
-- existing reader of the singular column — the homepage's "has a video"
-- filter and the VideoCarousel it feeds — keeps working completely
-- unchanged, seeing exactly the first video of a product's list. Only the
-- product page's own "See It IRL" section was extended to read the full
-- video_urls array (queuing every one of the product's own videos before
-- moving on to similar products' videos).
--
-- Safe to re-run: IF NOT EXISTS.
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS video_urls JSONB NOT NULL DEFAULT '[]';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'products' AND column_name = 'video_urls'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN products.video_urls IS ''Ordered array of video paths/URLs. Kept in sync with video_url (= video_urls[0], or NULL when empty) by the application on every write — see server/routes/products.js.''';
  END IF;
END $$;

-- Backfill: any product that already has a single video_url but no
-- video_urls entries yet gets that one video ported into the new array, so
-- existing products immediately show their video in the new admin UI
-- instead of looking empty.
UPDATE products
   SET video_urls = jsonb_build_array(video_url)
 WHERE video_url IS NOT NULL
   AND jsonb_array_length(video_urls) = 0;
