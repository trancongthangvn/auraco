-- 021_airwallex_payment_gateway.sql
--
-- Adds a real, gateway-processed payment method ('airwallex') alongside the
-- existing manual-confirmation ones (cashapp/zelle) and the currently-manual
-- 'card'/'paypal' entries. Airwallex is the single payment gateway in scope
-- (per HĐBS — one gateway, one integration, additional gateways are a
-- separate phụ lục) and is chosen because it accepts Vietnam-registered
-- merchants and supports Card + PayPal + Klarna in one integration, unlike
-- Stripe which doesn't onboard VN-registered accounts.
--
-- Two new columns on payment_transactions track the gateway's own state:
-- gateway_intent_id correlates our row with Airwallex's Payment Intent so
-- the webhook handler (server/routes/webhooks-airwallex.js) can find which
-- row to update, and gateway_raw_status keeps Airwallex's own status string
-- for support/debugging without overloading our own enum.

ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('card', 'paypal', 'cashapp', 'zelle', 'airwallex'));

ALTER TABLE payment_transactions DROP CONSTRAINT payment_transactions_method_check;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_method_check
  CHECK (method IN ('card', 'paypal', 'cashapp', 'zelle', 'airwallex'));

ALTER TABLE payment_transactions ADD COLUMN gateway_intent_id VARCHAR(64);
ALTER TABLE payment_transactions ADD COLUMN gateway_raw_status VARCHAR(40);
CREATE INDEX idx_payment_transactions_gateway_intent ON payment_transactions(gateway_intent_id)
  WHERE gateway_intent_id IS NOT NULL;

ALTER TABLE payment_method_settings DROP CONSTRAINT payment_method_settings_key_check;
ALTER TABLE payment_method_settings ADD CONSTRAINT payment_method_settings_key_check
  CHECK (key IN ('card', 'paypal', 'applePay', 'cashapp', 'zelle', 'airwallex'));

-- Seeded disabled — admin turns it on from /admin once real Airwallex
-- account credentials are in the server's .env (AIRWALLEX_CLIENT_ID /
-- AIRWALLEX_API_KEY / AIRWALLEX_WEBHOOK_SECRET). Turning it on before those
-- are set just means checkout will show a clear "temporarily unavailable"
-- error instead of a broken payment attempt (see routes/orders-payments.js).
INSERT INTO payment_method_settings (key, label, enabled, detail)
VALUES ('airwallex', 'Thẻ / PayPal / Klarna (Airwallex)', FALSE,
        'Thanh toán quốc tế qua Airwallex: thẻ tín dụng, PayPal, Klarna.')
ON CONFLICT (key) DO NOTHING;
