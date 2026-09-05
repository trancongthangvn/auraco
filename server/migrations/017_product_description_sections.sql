-- ============================================================================
-- 017 — Product description sections (named accordion entries)
--
-- The admin's single "Mô tả sản phẩm" textarea fed exactly one, fixed
-- accordion row on the product page ("Why You'll Love It" — see
-- app/(storefront)/product/[slug]/page.tsx). Explicit request: replace that
-- one box with a repeatable list of {title, content} pairs, each becoming
-- its own accordion row, so an admin can add as many named sections as a
-- product needs (own title per row) instead of only ever the one.
--
-- The old `description` column is left untouched — both the column and its
-- existing values — and still powers the accordion for any product that
-- has no rows in description_sections yet, so nothing already live changes
-- until an admin actually edits that product's sections.
--
-- Safe to re-run: IF NOT EXISTS.
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS description_sections JSONB NOT NULL DEFAULT '[]';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'products' AND column_name = 'description_sections'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN products.description_sections IS ''Ordered array of {title, content} pairs, each rendered as its own accordion row on the product page, ahead of the fixed Details/Delivery & Returns rows. Falls back to the single description column (as a "Why You''''ll Love It" row) when empty.''';
  END IF;
END $$;
