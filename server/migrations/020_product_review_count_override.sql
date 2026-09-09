-- ============================================================================
-- 020 — Products gain an optional "displayed review count" override
--
-- The number shown beside a product's stars on the public product page is
-- normally derived: COUNT(*) of that product's approved product_reviews rows
-- (see attachRelations() in routes/products.js), falling back to the seeded
-- products.review_count column while a product has no approved review yet.
--
-- Explicit request: let an admin type the number that appears there, the way
-- the reference storefront shows "(279)" beside its stars — a catalogue
-- imported from the client's live store carries review counts that were never
-- migrated as individual review rows, so the derived count reads far lower
-- than reality.
--
-- Kept as a SEPARATE nullable column rather than by writing into
-- products.review_count, because:
--   * NULL is a real state here — "no override, use the derived count" — and
--     review_count is NOT NULL DEFAULT 0, so it cannot express that;
--   * the derived count stays intact and visible underneath, so removing the
--     override restores the true number instead of leaving a stale one that
--     nothing can tell apart from a real count.
--
-- Only the count is overridable. The average rating still comes from real
-- reviews — nothing here touches products.rating.
--
-- Safe to re-run: IF NOT EXISTS + guarded constraint.
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count_override INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_review_count_override_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_review_count_override_check
      CHECK (review_count_override IS NULL OR review_count_override >= 0);
  END IF;
END $$;
