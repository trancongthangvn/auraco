-- 025_customer_accounts.sql
--
-- Real customer accounts behind the storefront's /login and /register pages,
-- which until now were UI only. An account holds the basics (name, email,
-- phone, password) and sees the orders it placed.
--
-- orders.customer_id links an order to the account that was signed in when
-- it was placed. Deliberately NOT linked by email: there is no email
-- verification yet (no mail service configured), so anyone could register
-- with someone else's address — matching past guest orders by email would
-- hand that person the real customer's name, phone and shipping address.
-- Guest orders stay unlinked (NULL); ON DELETE SET NULL keeps an order if its
-- account is ever removed.

CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(200) NOT NULL,
  password_hash TEXT         NOT NULL,
  full_name     VARCHAR(160) NOT NULL,
  phone         VARCHAR(40),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- One account per address regardless of letter case.
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_lower_uniq ON customers (lower(email));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER
  REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id) WHERE customer_id IS NOT NULL;
