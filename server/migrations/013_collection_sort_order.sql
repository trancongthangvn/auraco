-- ============================================================================
-- 013 — Per-collection product ordering.
--
-- GET /api/products?collection=X previously ordered results by the product's
-- global catalog sort_order, which happens to differ from a collection's own
-- intended order (confirmed against https://auracojewelry.com/cart's "Best
-- sellers" rail: it shows 8 specific products in a specific order that
-- doesn't match their /product catalog positions, and excludes a 9th product
-- our BEST-SELLERS collection had tagged). Reusing the catalog-wide order
-- for every collection was the wrong model — a product's rank within one
-- collection is independent of its rank in the full catalog.
-- ============================================================================

ALTER TABLE product_collections ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
