-- 022_payment_proof_reference_code.sql
--
-- Optional "Reference / transaction ID" the customer can type alongside the
-- screenshot when paying by QR (Cash App / Zelle) — the last 4 digits or the
-- confirmation number from their banking app. Purely an aid for the admin
-- reviewing the transfer: a screenshot alone can be ambiguous when several
-- customers pay similar amounts on the same day, and this gives the admin a
-- string to match against the bank statement.
--
-- Nullable with no default: existing rows (and any customer who skips the
-- field, which is explicitly optional in the checkout UI) keep NULL.

ALTER TABLE payment_transactions ADD COLUMN reference_code VARCHAR(120);
COMMENT ON COLUMN payment_transactions.reference_code IS
  'Customer-supplied transfer reference / transaction ID for manual (QR) payments. Optional, NULL when not provided.';
