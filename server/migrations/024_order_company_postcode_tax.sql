-- 024_order_company_postcode_tax.sql
--
-- The checkout form has always asked for Company (optional) and Postcode,
-- but neither was sent to the API nor had a column to land in — whatever
-- the customer typed was silently discarded, so the admin order page could
-- never show it (bug report: "bổ sung thêm thông tin cho: company,
-- postcode").
--
-- Tax had the same gap: the checkout adds the admin-set tax percent
-- (site_settings.extra.tax_percent) on top of the goods total and shows
-- the customer that grand total, but orders stored neither the tax nor a
-- total including it. An order the customer saw as $140.40 was recorded —
-- and asked to be transferred — as $130.00. tax_amount records it, and
-- orders.total now includes it (see POST /orders).
--
-- All nullable / defaulted: existing orders keep NULL company/postcode and
-- a tax of 0, which is exactly what was recorded for them.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS company VARCHAR(160);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS postal_code VARCHAR(40);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0
  CHECK (tax_amount >= 0);
