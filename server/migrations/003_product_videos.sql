-- ============================================================================
-- 003 — Product videos
--
-- The live site's homepage runs a `.home-section--videos` carousel: one short
-- looping MP4 per product, with the product's thumbnail/name/price pinned
-- underneath. Everything it needs is a single per-product video URL, so we
-- store it on `products` rather than inventing a side table — a product has at
-- most one hero video, exactly like the reference site.
--
-- Nullable on purpose: the vast majority of products have no video, and the
-- homepage section renders nothing at all when no product has one.
--
-- Safe to re-run: every statement is IF NOT EXISTS / conditional.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- products.video_url — path to an uploaded MP4 ("/uploads/<file>.mp4") or an
-- absolute URL. TEXT (not VARCHAR) because external CDN URLs get long.
-- ----------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'products' AND column_name = 'video_url'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN products.video_url IS ''Optional looping product video (MP4) shown in the homepage video carousel. NULL = no video.''';
  END IF;
END $$;

-- Normalize any empty strings a client may have written to NULL so the
-- storefront's "has a video" filter stays a simple IS NOT NULL test.
UPDATE products SET video_url = NULL WHERE video_url IS NOT NULL AND btrim(video_url) = '';

-- Partial index: the homepage only ever asks for the handful of rows that
-- actually have a video.
CREATE INDEX IF NOT EXISTS idx_products_video_url
  ON products (created_at DESC)
  WHERE video_url IS NOT NULL;
