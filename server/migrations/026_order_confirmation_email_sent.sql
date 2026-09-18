-- 026_order_confirmation_email_sent.sql
--
-- The order-confirmation ("thank you") email used to go out the moment an
-- order row was created — i.e. BEFORE the customer had paid, so cancelling on
-- PayPal's approval page still produced a thank-you email (bug report).
-- The email is now sent when a payment is actually confirmed, which can
-- arrive from several places (PayPal capture, the Airwallex webhook, an admin
-- marking a transfer received). Any of them may fire more than once —
-- Airwallex retries a webhook until it gets a 2xx, and an admin can re-save a
-- transaction — so this timestamp is what makes "send it once" true:
-- lib/orderEmail.js claims it with a conditional UPDATE and only sends if the
-- claim succeeded.
--
-- NULL means "not sent yet", which is also the correct reading for every
-- order placed before this migration: those emails already went out under the
-- old behaviour, but backfilling now would be guesswork, and the only way to
-- re-send one is a payment confirmation arriving later for an order that old.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN orders.confirmation_email_sent_at IS
  'When the order-confirmation email was sent. NULL = not sent. Claimed atomically in lib/orderEmail.js so a retried webhook cannot send it twice.';
