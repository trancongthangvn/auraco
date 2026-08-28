-- ============================================================================
-- 002 — Rework `posts` into a real article system, modeled on the reference
-- admin at CT114 (vaithaihoa) but with the gaps that admin has filled in:
--   * it stores article bodies as HTML, we were storing a JSONB array of
--     paragraph strings and lossily re-joining them around a rich text editor
--   * it has article_categories with full backend CRUD but NO admin UI at all
--     (a real gap there) — we add the table AND will ship the admin page
--
-- Safe to re-run: every statement is IF NOT EXISTS / conditional.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- post_categories (the "article_categories" equivalent)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_categories (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  name        VARCHAR(160) NOT NULL,
  description TEXT,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE post_categories IS 'Journal/news article categories (Styling, Care Guide, ...).';

-- ----------------------------------------------------------------------------
-- posts: add the columns a real editor needs
-- ----------------------------------------------------------------------------

-- content: HTML produced by the rich text editor. Replaces the old `body`
-- JSONB paragraph array, which could not represent headings/lists/images.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';

-- Backfill content from the old body array (each element was one block of
-- HTML or a bare paragraph string), then drop the old column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'posts' AND column_name = 'body'
  ) THEN
    UPDATE posts
       SET content = COALESCE((
             SELECT string_agg(
                      CASE WHEN elem LIKE '<%' THEN elem
                           ELSE '<p>' || elem || '</p>' END,
                      ''
                    )
               FROM jsonb_array_elements_text(body) AS elem
           ), '')
     WHERE content = '';
    ALTER TABLE posts DROP COLUMN body;
  END IF;
END $$;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS category_id      INTEGER REFERENCES post_categories(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title        VARCHAR(300);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_description  TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS og_image         TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views            INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at     TIMESTAMPTZ;

-- status drives `published`; `published` stays as the denormalized flag the
-- storefront queries actually filter on (derived server-side on write, never
-- trusted from the client).
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_status_check'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_status_check
      CHECK (status IN ('published', 'draft', 'scheduled'));
  END IF;
END $$;

-- Existing rows were all live, so keep them 'published' (the column default
-- already did that); make sure nothing is left inconsistent.
UPDATE posts SET status = 'published' WHERE published = TRUE  AND status IS NULL;
UPDATE posts SET status = 'draft'     WHERE published = FALSE AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status   ON posts(status);

-- ----------------------------------------------------------------------------
-- Seed a few starter categories so the picker is not empty on first use.
-- ----------------------------------------------------------------------------
INSERT INTO post_categories (slug, name, description, sort_order) VALUES
  ('styling',    'Styling',    'Cách phối và layer trang sức.',            0),
  ('care-guide', 'Care Guide', 'Bảo quản, làm sạch và giữ độ sáng.',       1),
  ('the-edit',   'The Edit',   'Tuyển chọn theo mùa và theo xu hướng.',    2)
ON CONFLICT (slug) DO NOTHING;

-- Put the existing journal posts under a sensible default category.
UPDATE posts
   SET category_id = (SELECT id FROM post_categories WHERE slug = 'styling')
 WHERE category_id IS NULL;
