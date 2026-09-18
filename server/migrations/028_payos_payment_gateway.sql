-- 028_payos_payment_gateway.sql
--
-- Adds 'payos' as a second gateway-processed payment method, alongside
-- Airwallex (021) — PayOS is a Vietnamese aggregator (VietQR bank transfer,
-- hosted checkout link). NOTE: the service contract (HĐBS) scopes exactly
-- one payment gateway integration as included work; a second gateway is
-- outside that scope and would need its own phụ lục if billed.
--
-- Same shape as Airwallex: payment_transactions.gateway_intent_id already
-- exists (021) and is reused here to hold PayOS's paymentLinkId, so the
-- webhook/return-confirm handlers (server/routes/webhooks-payos.js) can
-- find which row to update without a new column.

ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('card', 'paypal', 'cashapp', 'zelle', 'airwallex', 'payos'));

ALTER TABLE payment_transactions DROP CONSTRAINT payment_transactions_method_check;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_method_check
  CHECK (method IN ('card', 'paypal', 'cashapp', 'zelle', 'airwallex', 'payos'));

ALTER TABLE payment_method_settings DROP CONSTRAINT payment_method_settings_key_check;
ALTER TABLE payment_method_settings ADD CONSTRAINT payment_method_settings_key_check
  CHECK (key IN ('card', 'paypal', 'applePay', 'cashapp', 'zelle', 'airwallex', 'payos'));

-- Seeded disabled, same reasoning as Airwallex's own seed row (021): an
-- admin turns it on once PAYOS_CLIENT_ID/PAYOS_API_KEY/PAYOS_CHECKSUM_KEY
-- are set in the server's .env, and GET /api/payment-methods additionally
-- gates it on payos.isConfigured() for THIS server (see orders-payments.js)
-- so enabling it in this shared table only surfaces it on whichever
-- environment actually has those credentials — staging and production
-- share one database otherwise.
INSERT INTO payment_method_settings (key, label, enabled, detail)
VALUES ('payos', 'Chuyển khoản QR (PayOS)', FALSE,
        'Thanh toán qua PayOS: quét mã VietQR bằng app ngân hàng.')
ON CONFLICT (key) DO NOTHING;
