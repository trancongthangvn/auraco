// server/lib/payos.js
//
// PayOS integration: a Vietnamese payment aggregator — the shopper is
// redirected to a hosted checkout page and pays by scanning a VietQR code
// (or a bank-app deep link) to transfer to the merchant's linked account.
//
// Uses the official @payos/node SDK rather than hand-rolling PayOS's HMAC
// signature scheme (fields sorted alphabetically, then
// key=value&key=value..., HMAC-SHA256'd with the Checksum Key) — that
// scheme is easy to get subtly wrong (sort order, which fields, URL vs raw
// value), and getting it wrong is a security bug (a forged webhook would
// verify as genuine), so this defers to PayOS's own tested implementation
// for both signing a payment-link request and verifying a webhook/return.
//
// Needs env vars to do anything (see .env.example):
//   PAYOS_CLIENT_ID      PayOS dashboard > Payment channels > your channel
//   PAYOS_API_KEY        same screen
//   PAYOS_CHECKSUM_KEY   same screen — signs requests and verifies webhooks
//
// Until all three are set, isConfigured() is false and the routes that use
// this module return a clear 503 instead of attempting a request that
// would only fail confusingly.
//
// Unlike Airwallex/PayPal, there is no separate "environment" toggle here —
// PayOS has one API surface per account/channel (no distinct sandbox host),
// so testing means using a channel PayOS itself has marked as a test
// channel in its dashboard, not an env var this code chooses.

const { PayOS } = require('@payos/node');

function isConfigured() {
  return Boolean(
    process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY
  );
}

let client = null;
function getClient() {
  if (!isConfigured()) {
    throw new Error('PayOS is not configured (PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY missing)');
  }
  if (!client) {
    client = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }
  return client;
}

// PayOS's orderCode must be a positive integer, unique per payment link —
// this store's own numeric orders.id already satisfies that, so it's
// reused directly rather than inventing a second id to track.
//
// `amount` here must already be a whole number of VND — PayOS's API
// doesn't accept decimals and has no other currency; converting from this
// store's USD prices is the CALLER's job (see the payos_usd_to_vnd_rate
// admin setting used in routes/orders-payments.js), not this module's,
// since sending a raw USD number straight through as if it were VND
// undercharges by roughly the exchange rate (found while testing: a
// $140.40 order produced a 140 VND QR code).
async function createPaymentLink({ orderId, orderCode, amount, description, returnUrl, cancelUrl }) {
  const payos = getClient();
  return payos.paymentRequests.create({
    orderCode: orderId,
    amount: Math.max(1, Math.round(amount)),
    description: description || `Order ${orderCode}`.slice(0, 25), // PayOS caps this field at 25 chars
    returnUrl,
    cancelUrl,
  });
}

/** Server-to-PayOS status check — the source of truth this project's other
 *  gateways use instead of trusting the shopper's own browser redirect
 *  (see lib/paypal.js's capture, webhooks-airwallex.js). */
async function getPaymentLinkInfo(orderId) {
  const payos = getClient();
  return payos.paymentRequests.get(orderId);
}

/** Verifies and returns a webhook body's `data`, or throws if the
 *  signature doesn't check out against PAYOS_CHECKSUM_KEY. */
async function verifyWebhook(body) {
  const payos = getClient();
  return payos.webhooks.verify(body);
}

module.exports = { isConfigured, createPaymentLink, getPaymentLinkInfo, verifyWebhook };
