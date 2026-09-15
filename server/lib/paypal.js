// server/lib/paypal.js
//
// PayPal Checkout (REST v2) integration: exchange the app's client
// id/secret for a short-lived access token, create an order for one of our
// orders, and capture it once the shopper has approved it on PayPal.
//
// Unlike Airwallex (see lib/airwallex.js), PayPal answers "is this paid"
// synchronously: the capture call returns COMPLETED or it doesn't, so the
// capture response — not a webhook and never the browser's return URL alone
// — is what marks an order paid. A webhook can be added later for the
// asynchronous events that follow a payment (refunds, disputes, reversals).
//
// Needs env vars to do anything (see .env.example):
//   PAYPAL_ENV            'sandbox' (default) or 'live'
//   PAYPAL_CLIENT_ID      Developer Dashboard > Apps & Credentials > your app
//   PAYPAL_CLIENT_SECRET  same screen, behind "Show"
//
// Until PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET are set, isConfigured() is
// false and the routes that use this module return a clear 503 instead of
// attempting a request that would only fail confusingly.

function apiBase() {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function isConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

// Cached in-memory; fine for a single Node process (PM2 runs this app
// un-clustered per DEPLOYMENT.md), avoids re-authenticating on every
// checkout. PayPal tokens last ~9 hours; refreshed a minute early so a
// request can't race against expiry.
let cachedToken = null; // { token, expiresAt }

async function getAccessToken() {
  if (!isConfigured()) {
    throw new Error('PayPal is not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing)');
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 0) * 1000,
  };
  return cachedToken.token;
}

/** PayPal wants amounts as strings with exactly the currency's decimals. */
function formatAmount(amount) {
  return Number(amount).toFixed(2);
}

/**
 * Creates a PayPal order for one of our orders and returns it along with
 * the URL to send the shopper to for approval.
 *
 * `custom_id` carries our own order id so the capture step can prove the
 * PayPal order it was handed really belongs to the order being paid — a
 * client that made up an id can't get someone else's payment applied to
 * its order. `invoice_id` is the human-facing order code, which is what
 * shows up on the buyer's PayPal receipt and in the merchant dashboard.
 */
async function createOrder({ orderId, orderCode, amount, currency, returnUrl, cancelUrl }) {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Idempotency: a retried create (double-click, our own retry after a
      // network blip) returns the same PayPal order instead of a second one.
      'PayPal-Request-Id': `order-${orderId}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: String(orderId),
          invoice_id: orderCode,
          amount: { currency_code: currency, value: formatAmount(amount) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: returnUrl,
            cancel_url: cancelUrl,
            // The shopper already gave us their address at our checkout, and
            // the button they came from said what they're paying — so PayPal
            // shouldn't ask for shipping again or show a vague "Continue".
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
          },
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`PayPal create order failed: ${res.status} ${await res.text()}`);
  }
  const order = await res.json();
  return { order, approveUrl: approveUrlOf(order) };
}

/**
 * Where to send the shopper to approve. The rel is 'payer-action' when the
 * order was created with payment_source.paypal.experience_context (as above)
 * and 'approve' under the older application_context shape — both are
 * accepted so this keeps working if that request is ever changed back.
 */
function approveUrlOf(order) {
  const links = Array.isArray(order.links) ? order.links : [];
  const link =
    links.find((l) => l.rel === 'payer-action') || links.find((l) => l.rel === 'approve');
  return link ? link.href : null;
}

async function getOrder(paypalOrderId) {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`PayPal get order failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Captures an approved PayPal order — this is the call that actually moves
 * the money, and its response is what the caller judges "paid" on.
 *
 * A capture of an already-captured order comes back 422
 * ORDER_ALREADY_CAPTURED; that's reported as `alreadyCaptured` rather than
 * an error so the caller can go read the existing capture instead of
 * showing the shopper a failure for a payment that did go through.
 */
async function captureOrder(paypalOrderId) {
  const token = await getAccessToken();
  const res = await fetch(
    `${apiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `capture-${paypalOrderId}`,
      },
    }
  );
  if (res.ok) return { captured: await res.json(), alreadyCaptured: false };

  const bodyText = await res.text();
  if (res.status === 422 && bodyText.includes('ORDER_ALREADY_CAPTURED')) {
    return { captured: await getOrder(paypalOrderId), alreadyCaptured: true };
  }
  throw new Error(`PayPal capture failed: ${res.status} ${bodyText}`);
}

/**
 * Pulls the parts of a captured order the caller has to check before
 * trusting it: what PayPal says was actually paid, and which of our orders
 * it was for. Shape differs between a fresh capture response and a re-read
 * of an already-captured order, so both are read the same way here.
 */
function captureSummary(captured) {
  const unit = (captured.purchase_units || [])[0] || {};
  const capture = ((unit.payments || {}).captures || [])[0] || {};
  const amount = capture.amount || unit.amount || {};
  return {
    status: capture.status || captured.status || null,
    captureId: capture.id || null,
    customId: capture.custom_id || unit.custom_id || null,
    value: amount.value != null ? Number(amount.value) : null,
    currency: amount.currency_code || null,
  };
}

module.exports = {
  isConfigured,
  getAccessToken,
  createOrder,
  getOrder,
  captureOrder,
  captureSummary,
};
