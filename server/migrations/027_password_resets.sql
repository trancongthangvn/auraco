-- 027_password_resets.sql
--
-- Backs the "Forgot your password?" flow on /login: until now that link was
-- a demo stub (LoginForm.tsx just showed a canned message) - no way for a
-- customer who forgot their password to ever get back into their account.
--
-- Tokens are single-use and short-lived (60 minutes, enforced in
-- routes/account.js, not here) and stored hashed (sha256 of the token that
-- actually goes out in the email) so a DB read alone can't be used to reset
-- anyone's password. Deliberately its own table rather than a column on
-- customers: a customer can request more than one reset link, and old ones
-- must stop working once a newer one is used, not just overwrite in place.

CREATE TABLE IF NOT EXISTS password_resets (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_customer ON password_resets(customer_id);
