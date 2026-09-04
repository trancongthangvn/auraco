-- ============================================================================
-- 007 — Brand categories + admin-editable descriptions
--
-- Two gaps this closes:
--
-- 1. Collection ledes (the sentence under a collection's title, e.g. QUIET
--    LUXURY's "Understated elegance...") were hard-coded in CatalogClient.tsx,
--    with no admin path to change them. `collections.description` makes that
--    text editable the same way `image_url` already is.
--
-- 2. The four top-level "brand" categories (Necklaces, Bracelets, Earrings,
--    Signature Sets — the ?brand= links in the header nav) had no table at
--    all: not just no description, no admin surface of any kind. `brands`
--    gives them the same CRUD shape as `collections`, seeded with the slugs
--    already load-bearing in ?brand= URLs and nav links, and with the
--    sentences that were hard-coded in CatalogClient.tsx's CATEGORY_LEDE map
--    (kept there too, as the fallback for a brand row with no description).
--
-- Safe to re-run: every statement is IF NOT EXISTS / conditional, and the
-- seed INSERTs no-op on conflict.
-- ============================================================================

ALTER TABLE collections ADD COLUMN IF NOT EXISTS description TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'collections' AND column_name = 'description'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN collections.description IS ''Lede shown under the collection title on its /catalog/<slug> page. NULL falls back to the hard-coded default in CatalogClient.tsx.''';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS brands (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(80)  NOT NULL UNIQUE,   -- matches the ?brand= query value, e.g. 'Signature-Sets'
  name        VARCHAR(120) NOT NULL,
  description TEXT,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE brands IS 'Top-level product-type nav categories (Necklaces, Bracelets, Earrings, Signature Sets) — the ?brand= filter. slug is the exact ?brand= value.';

INSERT INTO brands (slug, name, description, sort_order) VALUES
  ('Necklaces', 'Necklaces', 'Timeless designs finished in luminous 18k gold. Handcrafted for effortless layering and everyday luxury.', 1),
  ('Bracelets', 'Bracelets', 'Bangles, chains and tennis styles built to stack. Finished by hand in 18k gold vermeil and sterling silver.', 2),
  ('Earrings', 'Earrings', 'Huggies, hoops and drops for every ear stack. Lightweight enough to wear from the commute to the evening.', 3),
  ('Signature-Sets', 'Signature Sets', 'Pieces chosen to be worn together. Matched metals and motifs, ready to gift or keep for yourself.', 4)
ON CONFLICT (slug) DO NOTHING;

UPDATE collections SET description = 'Understated elegance and timeless silhouettes. Discover pieces designed for effortless, lasting sophistication.' WHERE slug = 'QUIET-LUXURY' AND description IS NULL;
UPDATE collections SET description = 'Effortless, polished, and minimal. Discover the everyday pieces that complete the ultimate clean girl aesthetic.' WHERE slug = 'MINIMALIST' AND description IS NULL;
UPDATE collections SET description = 'Channel prosperity and positive energy. Discover symbolic pieces designed to align your vibration with abundance.' WHERE slug = 'STATEMENT' AND description IS NULL;
UPDATE collections SET description = 'Most-wanted styles, right this second. Discover what the IT girls are wearing today.' WHERE slug = 'TRENDING-NOW' AND description IS NULL;
UPDATE collections SET description = 'Sun-drenched styles for endless summer days. Discover lightweight pieces designed to catch the coastal light.' WHERE slug = 'BEACH-VIBE' AND description IS NULL;
UPDATE collections SET description = 'Tried, tested, and adored. Shop the styles our community reaches for on repeat.' WHERE slug = 'BEST-SELLERS' AND description IS NULL;
