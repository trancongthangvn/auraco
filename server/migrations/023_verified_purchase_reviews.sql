-- 023_verified_purchase_reviews.sql
--
-- Backs the post-purchase review screen (linked from the order-confirmation
-- page): a customer who just bought an item can review it, and that review
-- is marked as coming from a real order.
--
--   order_id    the order the review was written from. NOT NULL only for
--               reviews submitted through that screen — a review left from
--               the public product page keeps NULL, and the storefront
--               shows the "Verified purchase" badge on exactly the rows
--               that have it. ON DELETE SET NULL so deleting an old order
--               never deletes the customer's review with it.
--   title       optional one-line headline ("What stood out most?"), shown
--               above the review body. Nullable: it is explicitly optional
--               in the form.
--   photo_urls  up to 5 photos. photo_url (migration 015) stays as the
--               first of them, mirroring how products.video_url is kept as
--               video_urls[0] — every existing reader of photo_url keeps
--               working untouched.

ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS order_id INTEGER
  REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

CREATE INDEX IF NOT EXISTS idx_product_reviews_order ON product_reviews(order_id)
  WHERE order_id IS NOT NULL;

DO $$
BEGIN
  EXECUTE 'COMMENT ON COLUMN product_reviews.order_id IS ''Order this review was written from, when submitted through the post-purchase review screen. NULL for reviews left from the public product page; non-NULL is what "Verified purchase" means.''';
  EXECUTE 'COMMENT ON COLUMN product_reviews.title IS ''Optional one-line review headline. NULL when the customer skipped it.''';
  EXECUTE 'COMMENT ON COLUMN product_reviews.photo_urls IS ''All customer photos for this review (max 5). photo_url is kept as photo_urls[1] for existing readers.''';
END $$;

-- Existing rows with a single photo get a consistent array form.
UPDATE product_reviews
   SET photo_urls = ARRAY[photo_url]
 WHERE photo_url IS NOT NULL AND photo_urls IS NULL;
