-- ============================================================================
-- AURA & CO — PostgreSQL schema
-- Raw SQL, no ORM. Designed to back the Express API in server/.
--
-- Design notes:
--   * Money is stored as NUMERIC(10,2) (USD). Frontend mock data sometimes
--     formats totals as strings ("$230.00") — those are derived at query/
--     presentation time, never stored as text.
--   * Timestamps use TIMESTAMPTZ; the frontend mocks use dd/mm/yyyy strings
--     purely for display — real rows use proper timestamps and are formatted
--     by the API/frontend.
--   * homepage_content (hero slides + testimonials) is modeled as two small
--     normalized tables (hero_slides, testimonials), one row per item, so
--     admins can add/remove/reorder individual items without rewriting a
--     whole JSON blob. Each row's own free-form bits (e.g. testimonial quote)
--     stay as plain columns since the shape is fixed and simple.
--   * site_settings is a single-row key config table (id = 1 enforced by a
--     CHECK) holding simple site-wide toggles/text that don't warrant their
--     own tables (e.g. store contact info, free-shipping threshold, footer
--     link JSON). Add columns as new settings are needed, or repurpose the
--     `extra` JSONB column for anything ad hoc.
--   * product_attributes is normalized (one row per name/value pair) rather
--     than JSONB because admins will want to edit individual attribute rows
--     in the admin UI (add/remove a spec line).
--   * collections <-> products is many-to-many (a product can belong to
--     multiple collections, e.g. "BEACH-VIBE" + "BEST-SELLERS") via the
--     product_collections join table.
--   * Payment methods needed now: card (build later), paypal (kept
--     structurally possible), cashapp + zelle as MANUAL confirmation flows
--     (customer pays externally against a QR code and uploads proof of
--     payment; admin reviews the proof and marks the order paid) — modeled
--     via payment_transactions.proof_image_url + a status enum, analogous
--     to a bank-transfer/"ck" manual-confirmation pattern.
--
-- Table creation order respects foreign-key dependencies:
--   admin_users, collections, products, product_attributes,
--   product_collections, discount_codes, orders, order_items, inquiries,
--   press_mentions, product_reviews, payment_method_settings,
--   payment_transactions, hero_slides, testimonials, site_settings, posts
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid(), if ever needed

-- ----------------------------------------------------------------------------
-- admin_users
-- ----------------------------------------------------------------------------
CREATE TABLE admin_users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(60)  NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,             -- bcrypt hash
  display_name  VARCHAR(120) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'staff'
                CHECK (role IN ('admin', 'staff')),
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE admin_users IS 'Backoffice accounts (Chủ shop / Nhân viên). role=admin unlocks full permissions.';

-- ----------------------------------------------------------------------------
-- collections (categories / marketing collections, e.g. QUIET-LUXURY)
-- ----------------------------------------------------------------------------
CREATE TABLE collections (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(80)  NOT NULL UNIQUE,   -- e.g. 'BEACH-VIBE', 'BEST-SELLERS'
  name        VARCHAR(120) NOT NULL,           -- display label, e.g. 'Beach Vibe'
  image_url   TEXT,
  href        TEXT,                            -- optional explicit link override
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE collections IS 'Marketing collections / category filter chips (QUIET-LUXURY, BEACH-VIBE, NEW-ARRIVALS, BEST-SELLERS, ...).';

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
CREATE TABLE products (
  id                SERIAL PRIMARY KEY,
  slug              VARCHAR(160) NOT NULL UNIQUE, -- e.g. 'Evermere-Heart-Necklace'
  name              VARCHAR(200) NOT NULL,
  category          VARCHAR(40)  NOT NULL
                    CHECK (category IN ('Necklaces', 'Bracelets', 'Earrings', 'Signature Sets')),
  material          VARCHAR(200) NOT NULL,
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price  NUMERIC(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  rating            NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count      INTEGER      NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  images            JSONB        NOT NULL DEFAULT '[]', -- ordered array of image URLs
  short_description VARCHAR(200), -- always-visible one-line tagline under the product name; distinct from the long description below
  description       TEXT         NOT NULL DEFAULT '',
  features          JSONB        NOT NULL DEFAULT '[]', -- array of short strings
  stock             INTEGER      NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active            BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order        INTEGER      NOT NULL DEFAULT 0, -- manual priority, lower shows first; 0 = falls back to created_at DESC
  video_url         TEXT, -- optional looping product video for the homepage video carousel
  bundle_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
                    CHECK (bundle_discount_percent >= 0 AND bundle_discount_percent <= 100),
  brand             VARCHAR(160), -- free-text designer/collection name, distinct from category (Necklaces/...) and collections (Quiet Luxury/...)
  thumbnail_url     TEXT,
  discount_percent  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  badge_label       VARCHAR(40), -- small black card badge, e.g. HOT, LIMITED — null/empty hides it
  sticker_image_url TEXT,
  meta_title        VARCHAR(200),
  meta_description  VARCHAR(320),
  show_at_home      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE products IS 'Catalog products. images/features kept as JSONB arrays (ordered, no relational needs); attributes are normalized separately.';
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_sort_order ON products (sort_order, created_at DESC);

-- ----------------------------------------------------------------------------
-- product_variants (purchasable color/size combinations, admin-managed)
-- ----------------------------------------------------------------------------
CREATE TABLE product_variants (
  id                SERIAL PRIMARY KEY,
  product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name        VARCHAR(80),
  color_swatch      VARCHAR(20),
  size              VARCHAR(40),
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price  NUMERIC(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku               VARCHAR(80),
  front_image       TEXT,
  hover_images      JSONB NOT NULL DEFAULT '[]',
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE product_variants IS 'Purchasable color/size combinations. A product with zero rows here behaves exactly as a non-variant product (its own price/stock/images are used directly). Exactly one row per product should have is_default = true when the product has any — enforced in the API, not SQL.';
CREATE INDEX idx_product_variants_product ON product_variants (product_id, sort_order);

-- ----------------------------------------------------------------------------
-- product_bundles ("frequently bought together" companions, admin-picked)
-- ----------------------------------------------------------------------------
CREATE TABLE product_bundles (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  companion_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (product_id <> companion_id),
  UNIQUE (product_id, companion_id)
);
CREATE INDEX idx_product_bundles_product ON product_bundles (product_id, sort_order);

-- ----------------------------------------------------------------------------
-- product_attributes (normalized ProductAttribute[] — spec rows like
-- { name: "Material", value: "18ct Gold Vermeil over Sterling Silver" })
-- ----------------------------------------------------------------------------
CREATE TABLE product_attributes (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  value       VARCHAR(300) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_attributes_product ON product_attributes(product_id);

-- ----------------------------------------------------------------------------
-- product_collections (join table: products <-> collections, many-to-many)
-- ----------------------------------------------------------------------------
CREATE TABLE product_collections (
  product_id    INTEGER NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, collection_id)
);
CREATE INDEX idx_product_collections_collection ON product_collections(collection_id);

-- ----------------------------------------------------------------------------
-- discount_codes
-- ----------------------------------------------------------------------------
CREATE TABLE discount_codes (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(40)  NOT NULL UNIQUE, -- e.g. 'AURA10'
  type         VARCHAR(10)  NOT NULL CHECK (type IN ('percent', 'fixed')),
  value        NUMERIC(10,2) NOT NULL CHECK (value >= 0),
  min_order    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  usage_limit  INTEGER      NOT NULL DEFAULT 0 CHECK (usage_limit >= 0),
  used         INTEGER      NOT NULL DEFAULT 0 CHECK (used >= 0),
  start_date   DATE         NOT NULL,
  end_date     DATE         NOT NULL,
  active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE discount_codes IS 'Percent/fixed discount codes with optional min order, usage cap, and active window.';

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
  id                SERIAL PRIMARY KEY,
  order_code        VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. 'AC-1042'
  customer_name     VARCHAR(160) NOT NULL,
  email             VARCHAR(200) NOT NULL,
  phone             VARCHAR(40)  NOT NULL,
  address           TEXT         NOT NULL,
  city              VARCHAR(160) NOT NULL,
  country           VARCHAR(100) NOT NULL DEFAULT 'Vietnam',
  subtotal          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  shipping_fee      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total             NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  discount_code_id  INTEGER REFERENCES discount_codes(id) ON DELETE SET NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'Đang xử lý'
                    CHECK (status IN ('Đang xử lý', 'Đã giao', 'Đã hủy')),
  payment_method    VARCHAR(20)  NOT NULL
                    CHECK (payment_method IN ('card', 'paypal', 'cashapp', 'zelle')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE orders IS 'Customer orders. total/subtotal/shipping_fee/discount_amount are NUMERIC; format as "$x.xx" at the API/frontend layer.';
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ----------------------------------------------------------------------------
-- order_items
-- ----------------------------------------------------------------------------
CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL, -- keep item if product later deleted
  name         VARCHAR(200) NOT NULL,   -- snapshot at time of purchase
  material     VARCHAR(200) NOT NULL,   -- snapshot at time of purchase
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0), -- unit price snapshot
  qty          INTEGER NOT NULL CHECK (qty > 0),
  image_url    TEXT,
  variant_id    INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  variant_label VARCHAR(120) -- snapshot, e.g. 'Gold / One Size'
);
COMMENT ON TABLE order_items IS 'Line items snapshot name/material/price at purchase time so historical orders remain accurate if the product changes later.';
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ----------------------------------------------------------------------------
-- inquiries (contact form submissions)
-- ----------------------------------------------------------------------------
CREATE TABLE inquiries (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  email      VARCHAR(200) NOT NULL,
  phone      VARCHAR(40),
  subject    VARCHAR(200) NOT NULL,
  message    TEXT         NOT NULL,
  resolved   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_inquiries_resolved ON inquiries(resolved);

-- ----------------------------------------------------------------------------
-- press_mentions
-- ----------------------------------------------------------------------------
CREATE TABLE press_mentions (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,  -- e.g. 'VOGUE'
  logo_url   TEXT,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  active     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- product_reviews
-- ----------------------------------------------------------------------------
CREATE TABLE product_reviews (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER REFERENCES products(id) ON DELETE CASCADE,
  product_name  VARCHAR(200) NOT NULL, -- snapshot, in case product is later deleted
  customer_name VARCHAR(160) NOT NULL,
  rating        SMALLINT     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT         NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'Chờ duyệt'
                CHECK (status IN ('Chờ duyệt', 'Đã duyệt', 'Từ chối')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_status ON product_reviews(status);

-- ----------------------------------------------------------------------------
-- payment_method_settings
-- ----------------------------------------------------------------------------
CREATE TABLE payment_method_settings (
  key     VARCHAR(20) PRIMARY KEY
          CHECK (key IN ('card', 'paypal', 'applePay', 'cashapp', 'zelle')),
  label   VARCHAR(120) NOT NULL,
  enabled BOOLEAN      NOT NULL DEFAULT FALSE,
  detail  TEXT         NOT NULL DEFAULT '', -- e.g. handle/email, or QR image URL for cashapp/zelle
  qr_image_url TEXT                          -- for cashapp/zelle manual-confirmation QR display
);
COMMENT ON TABLE payment_method_settings IS 'Toggle + config per payment method. card/paypal are gateway-processed; cashapp/zelle are manual confirmation (QR + customer-uploaded proof, admin review) — same pattern as a bank-transfer "ck" flow.';

-- ----------------------------------------------------------------------------
-- payment_transactions
-- ----------------------------------------------------------------------------
CREATE TABLE payment_transactions (
  id                SERIAL PRIMARY KEY,
  order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method            VARCHAR(20) NOT NULL
                    CHECK (method IN ('card', 'paypal', 'cashapp', 'zelle')),
  amount            NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status            VARCHAR(20) NOT NULL DEFAULT 'Chờ xử lý'
                    CHECK (status IN ('Chờ xử lý', 'Đã thanh toán', 'Thất bại', 'Đã hủy')),
  -- Manual-confirmation fields (cashapp/zelle): customer uploads a screenshot
  -- of their external payment; admin reviews it and flips status.
  proof_image_url   TEXT,
  reviewed_by       INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

-- ----------------------------------------------------------------------------
-- hero_slides (homepage hero carousel)
-- ----------------------------------------------------------------------------
CREATE TABLE hero_slides (
  id         SERIAL PRIMARY KEY,
  label      VARCHAR(80)  NOT NULL,   -- e.g. 'TRENDING NOW'
  title      VARCHAR(300) NOT NULL,
  href       TEXT         NOT NULL,
  image_url  TEXT         NOT NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  active     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- testimonials (homepage customer quotes)
-- ----------------------------------------------------------------------------
CREATE TABLE testimonials (
  id         SERIAL PRIMARY KEY,
  initials   VARCHAR(6)   NOT NULL,
  name       VARCHAR(160) NOT NULL,
  quote      TEXT         NOT NULL,
  quote_date DATE         NOT NULL DEFAULT CURRENT_DATE,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  active     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- site_settings (single-row site config)
-- ----------------------------------------------------------------------------
CREATE TABLE site_settings (
  id                      SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- enforce singleton row
  store_name              VARCHAR(160) NOT NULL DEFAULT 'AURA & CO',
  contact_email           VARCHAR(200),
  contact_phone           VARCHAR(40),
  free_shipping_threshold NUMERIC(10,2) NOT NULL DEFAULT 120,
  trust_badges            JSONB        NOT NULL DEFAULT '[]', -- e.g. ["2 YEAR WARRANTY", ...]
  footer_links            JSONB        NOT NULL DEFAULT '{}', -- { shop: [...], policies: [...] }
  extra                   JSONB        NOT NULL DEFAULT '{}', -- catch-all for future ad hoc settings
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE site_settings IS 'Singleton config row (id always 1). Use `extra` JSONB for new settings instead of migrating the table when possible.';
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- posts (journal / news articles)
-- ----------------------------------------------------------------------------
CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  slug       VARCHAR(200) NOT NULL UNIQUE,
  title      VARCHAR(300) NOT NULL,
  excerpt    TEXT,
  body       JSONB        NOT NULL DEFAULT '[]', -- ordered array of paragraph strings
  image_url  TEXT,
  published  BOOLEAN      NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_published ON posts(published, published_at DESC);
