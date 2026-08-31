-- ============================================================================
-- 004 — Product sort order
--
-- Admin needs to hand-pick which products lead the catalog/homepage instead
-- of always falling back to created_at DESC. Lower numbers sort first; 0
-- (the default for every existing row) means "no manual priority" and simply
-- falls through to the existing created_at ordering, so nothing changes for
-- a product until an admin explicitly gives it a number.
--
-- Safe to re-run: every statement is IF NOT EXISTS / conditional.
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'products' AND column_name = 'sort_order'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN products.sort_order IS ''Manual display priority — lower shows first. 0 = no priority, falls back to created_at DESC.''';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products (sort_order, created_at DESC);
