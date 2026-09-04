-- ============================================================================
-- 014 — Separate catalog-page hero banner image from the homepage tile image.
--
-- collections.image_url was being reused for both the homepage "Collections"
-- grid tile AND the /catalog/<slug> page's hero banner — but the reference
-- site uses two distinct images for these: a small still-life product shot
-- for the homepage tile, and a large lifestyle/model photo
-- (`.catalog-category-hero`, `/storage/categories/catalog-banners/*`) for
-- the catalog page's own hero. Reusing one image for both made every
-- collection's catalog page show the wrong (tile) photo as its hero.
-- ============================================================================

ALTER TABLE collections ADD COLUMN IF NOT EXISTS banner_url TEXT;
