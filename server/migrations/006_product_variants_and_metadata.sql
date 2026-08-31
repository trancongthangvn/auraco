-- ============================================================================
-- 006 — Real product variants (color/size), plus card/SEO metadata fields
--
-- Reverses the earlier explicit decision (see DEPLOYMENT.md) to keep "Metal"
-- display-only with no real per-metal price/stock/image — the project owner
-- has now asked for a real variant system after auditing a reference admin
-- (auracojewelry.com/admin's "New product" form).
--
-- product_variants: one row per purchasable color/size combination. A
-- product with no variant rows behaves exactly as today (its own
-- price/stock/images are used directly) — this is additive, not a rewrite of
-- existing products. Every existing product keeps working with zero
-- variants until an admin adds some.
--
-- products.stock stays the source of truth for a product with no variants;
-- for a product WITH variants, the API layer is responsible for keeping it
-- in sync as sum(variant stock) on every variant write ("Synced from
-- variants on save", matching the reference's own field hint) — enforcing
-- that in SQL would need a trigger for one convenience column, not worth it.
--
-- Safe to re-run: every statement is IF NOT EXISTS / conditional.
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_variants (
  id                SERIAL PRIMARY KEY,
  product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name        VARCHAR(80),                    -- e.g. 'Gold', 'Rose Gold' — null if this product has no color axis
  color_swatch      VARCHAR(20),                     -- CSS color (hex or name) shown as the swatch dot
  size              VARCHAR(40),                     -- e.g. 'One Size', '16"', 'S' — null if no size axis
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price  NUMERIC(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku               VARCHAR(80),
  front_image       TEXT,                            -- falls back to the product's own images[0] when null
  hover_images      JSONB NOT NULL DEFAULT '[]',      -- 3-5 extra gallery images for this variant specifically
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,   -- the variant selected/shown before the visitor picks one
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE product_variants IS 'Purchasable color/size combinations. Exactly one row per product should have is_default = true when the product has any variants at all (enforced in the API, not SQL, so a mid-edit state never fails a write).';
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id, sort_order);

-- ----------------------------------------------------------------------------
-- products: card/SEO/merchandising metadata seen on the reference admin form
-- that this project didn't have a column for yet.
-- ----------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(160);
ALTER TABLE products ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
  CHECK (discount_percent >= 0 AND discount_percent <= 100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge_label VARCHAR(40);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sticker_image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description VARCHAR(320);
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_at_home BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand') THEN
    EXECUTE 'COMMENT ON COLUMN products.brand IS ''Free-text designer/collection name shown on the reference admin (distinct from `category`, which is the storefront Necklaces/Bracelets/etc filter, and from `collections`, the Quiet Luxury/Minimalist tags). Nullable — optional.''';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'discount_percent') THEN
    EXECUTE 'COMMENT ON COLUMN products.discount_percent IS ''Strikethrough-original + sale-price display on the product CARD, independent of compare_at_price/bundle_discount_percent. 0 = no card discount shown.''';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'badge_label') THEN
    EXECUTE 'COMMENT ON COLUMN products.badge_label IS ''Small black badge top-left of the product card, e.g. HOT, LIMITED. Null/empty hides it.''';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'show_at_home') THEN
    EXECUTE 'COMMENT ON COLUMN products.show_at_home IS ''Whether this product appears in the homepage video carousel (uses its first product_videos-equivalent — see video_url).''';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- order_items: snapshot which variant was purchased, same pattern as the
-- existing name/material snapshot columns (accurate even if the variant is
-- later edited or deleted).
-- ----------------------------------------------------------------------------
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_label VARCHAR(120); -- e.g. 'Gold / One Size', snapshot at purchase time
