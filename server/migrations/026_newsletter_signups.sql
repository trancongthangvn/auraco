-- 026_newsletter_signups.sql
--
-- Backs the homepage welcome popup ("Sign up for 10% off"): until now its
-- form only flipped to a "check your inbox" message locally — no email was
-- ever captured, no code was ever generated, so there was nothing to check.
-- One row per email that has claimed a welcome code, referencing the code
-- itself in discount_codes so it reuses that table's existing validate/apply
-- logic at checkout with no changes there.
--
-- Deliberately keyed by email, not linked to `customers`: a welcome offer is
-- claimed before anyone necessarily creates an account, and the unique index
-- is what makes "only the first signup for an email gets a code" enforceable
-- at the database level, not just in application code.

CREATE TABLE IF NOT EXISTS newsletter_signups (
  id                SERIAL PRIMARY KEY,
  email             VARCHAR(200) NOT NULL,
  discount_code_id  INTEGER REFERENCES discount_codes(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One welcome code per address regardless of letter case.
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_signups_email_lower_uniq ON newsletter_signups (lower(email));
