-- ============================================================================
-- 016 — Product short description
--
-- The product page's long description (products.description) only ever
-- renders inside the collapsed "Why You'll Love It" accordion, so a visitor
-- who never opens it sees no summary at all. The reference site pins a
-- one-line tagline directly under the product title/name, always visible.
-- This adds a dedicated short_description column for that line, admin-set
-- and independent of the long accordion description.
--
-- Safe to re-run: IF NOT EXISTS.
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description VARCHAR(200);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'products' AND column_name = 'short_description'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN products.short_description IS ''One-line tagline shown directly under the product name on the product page, always visible (distinct from the long description in the collapsed "Why You''''ll Love It" accordion).''';
  END IF;
END $$;
