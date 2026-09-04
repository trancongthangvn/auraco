-- ============================================================================
-- 010 — Brand category images
--
-- The homepage "Shop by category" rail (Necklaces/Bracelets/Earrings/
-- Signature Sets) had no image of its own — it derived each tile's picture
-- from "the first product in that category with images" (see
-- loadCategoryRailImages() in app/(storefront)/page.tsx), which drifts
-- every time products.sort_order or the catalog changes. The reference
-- site's rail is nothing like that: each tile is a fixed, dedicated image
-- served from its own /storage/brands/<uuid> path, completely independent
-- of the product catalog. This gives `brands` the same fixed image_url
-- column `collections` already has, so the rail can be admin-curated the
-- same way instead of an incidental side effect of catalog ordering.
--
-- Safe to re-run: IF NOT EXISTS.
-- ============================================================================

ALTER TABLE brands ADD COLUMN IF NOT EXISTS image_url TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'brands' AND column_name = 'image_url'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN brands.image_url IS ''Fixed tile image for the homepage Shop-by-category rail. NULL falls back to a derived product image in the frontend.''';
  END IF;
END $$;
