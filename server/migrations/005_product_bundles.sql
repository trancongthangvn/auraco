-- ============================================================================
-- 005 — Frequently-bought-together bundles
--
-- The product page's "Frequently bought together" panel was picking its two
-- companion products automatically (first two items from the same
-- collection) with no admin control and no real bundle discount — the
-- "Save $X" it showed only ever summed each companion's own pre-existing
-- compare_at_price, never a discount for buying them together.
--
-- product_bundles lets an admin hand-pick the companion(s) for a specific
-- product. bundle_discount_percent lives on the product itself (not the
-- join row) because the discount describes "the deal for buying this
-- product's bundle", not any one companion pairing.
--
-- Safe to re-run: every statement is IF NOT EXISTS / conditional.
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS bundle_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
  CHECK (bundle_discount_percent >= 0 AND bundle_discount_percent <= 100);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'products' AND column_name = 'bundle_discount_percent'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN products.bundle_discount_percent IS ''Percent knocked off the bundle total when every Frequently-bought-together companion is selected alongside this product. 0 = no bundle discount.''';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS product_bundles (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  companion_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (product_id <> companion_id),
  UNIQUE (product_id, companion_id)
);
COMMENT ON TABLE product_bundles IS 'Admin-picked "frequently bought together" companions. One row per (product, companion) pair; a product can have several companions.';

CREATE INDEX IF NOT EXISTS idx_product_bundles_product ON product_bundles (product_id, sort_order);
