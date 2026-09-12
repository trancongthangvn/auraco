// server/lib/airwallex.js
//
// Minimal Airwallex integration: exchange the account's API key for a
// short-lived access token, create a Payment Intent for an order, and
// verify the payment_intent.* webhook Airwallex calls back with the final
// result. The shopper's browser redirect back to our site after paying is
// NOT trustworthy on its own (it can be replayed, skipped, or forged) — the
// webhook, signature-verified here, is the only source of truth for "this
// order is actually paid".
//
// Needs env vars to do anything (see .env.example):
//   AIRWALLEX_ENV             'demo' (sandbox, default) or 'prod'
//   AIRWALLEX_CLIENT_ID       from the Airwallex dashboard (Developer > API keys)
//   AIRWALLEX_API_KEY         from the Airwallex dashboard
//   AIRWALLEX_WEBHOOK_SECRET  from the webhook's own settings page in the dashboard
//
// Until AIRWALLEX_CLIENT_ID/AIRWALLEX_API_KEY are set, isConfigured() is
// false and the routes that use this module return a clear 503 instead of
// attempting a request that would only fail confusingly.

const crypto = require('crypto');

function apiBase() {
  return process.env.AIRWALLEX_ENV === 'prod'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';
}

function isConfigured() {
  return Boolean(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY);
}

// Cached in-memory; fine for a single Node process (PM2 runs this app
// un-clustered per DEPLOYMENT.md), avoids re-authenticating on every
// checkout. Airwallex tokens are short-lived (~30 min), refreshed a bit
// early to avoid a request racing against expiry.
let cachedToken = null; // { token, expiresAt }

async function getAccessToken() {
  if (!isConfigured()) {
    throw new Error('Airwallex is not configured (AIRWALLEX_CLIENT_ID / AIRWALLEX_API_KEY missing)');
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const res = await fetch(`${apiBase()}/api/v1/authentication/login`, {
    method: 'POST',
    headers: {
      'x-client-id': process.env.AIRWALLEX_CLIENT_ID,
      'x-api-key': process.env.AIRWALLEX_API_KEY,
    },
  });
  if (!res.ok) {
    throw new Error(`Airwallex auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = { token: data.token, expiresAt: new Date(data.expires_at).getTime() };
  return cachedToken.token;
}

// Creates a Payment Intent for one order. amount is a plain number in the
// major currency unit (e.g. 98.00, not cents) per Airwallex's API; currency
// is an explicit param rather than assumed, since the store's checkout
// currency is a product decision, not this module's to guess.
async function createPaymentIntent({ orderId, orderCode, amount, currency }) {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/api/v1/pa/payment_intents/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Caller-supplied idempotency key so a retried request (e.g. a
      // double-click, or our own retry after a network error) never
      // creates two intents / double-charges for the same order.
      request_id: `order-${orderId}`,
      amount,
      currency,
      merchant_order_id: orderCode,
    }),
  });
  if (!res.ok) {
    throw new Error(`Airwallex create intent failed: ${res.status} ${await res.text()}`);
  }
  return res.json(); // { id, client_secret, status, ... }
}

// HMAC-SHA256 signature check per Airwallex's webhook docs: the header
// 'x-signature' is HMAC-SHA256(x-timestamp + rawBody, webhook_secret),
// keyed with the secret shown on the webhook's own settings page in the
// dashboard (NOT the API key). rawBody must be the exact bytes Airwallex
// sent — see routes mounting in index.js, which parses this one route with
// express.raw() instead of the app-wide express.json() so this string
// matches byte-for-byte.
function verifyWebhookSignature({ rawBody, timestamp, signature }) {
  const secret = process.env.AIRWALLEX_WEBHOOK_SECRET;
  if (!secret) throw new Error('AIRWALLEX_WEBHOOK_SECRET is not configured');
  if (!timestamp || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}${rawBody}`)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const gotBuf = Buffer.from(signature, 'utf8');
  return expectedBuf.length === gotBuf.length && crypto.timingSafeEqual(expectedBuf, gotBuf);
}

module.exports = { isConfigured, getAccessToken, createPaymentIntent, verifyWebhookSignature };
