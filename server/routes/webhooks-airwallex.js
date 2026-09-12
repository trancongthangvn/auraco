// server/routes/webhooks-airwallex.js
//
// Handles Airwallex's webhook callback — the only trustworthy signal that a
// payment actually succeeded or failed (never the shopper's browser
// redirect back to our site, which can be replayed, skipped, or forged).
//
// Mounted directly in index.js with express.raw() BEFORE the app-wide
// express.json(), because the signature in verifyWebhookSignature() must be
// computed over the exact bytes Airwallex sent — re-serializing a
// JSON-parsed body would not match.
//
// Exported as a plain (req, res) handler, not an express.Router, since it
// needs that special raw-body mounting rather than sharing the JSON-parsed
// router mounted at /api in index.js.

const { query } = require('../db');
const { verifyWebhookSignature } = require('../lib/airwallex');

const TERMINAL_STATUS_BY_EVENT = {
  'payment_intent.succeeded': 'Đã thanh toán',
  'payment_intent.failed': 'Thất bại',
  'payment_intent.cancelled': 'Đã hủy',
};

async function handleAirwallexWebhook(req, res) {
  const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : '';
  const timestamp = req.header('x-timestamp');
  const signature = req.header('x-signature');

  let valid = false;
  try {
    valid = verifyWebhookSignature({ rawBody, timestamp, signature });
  } catch (err) {
    console.error('[airwallex webhook] signature check errored:', err.message);
    return res.status(503).send('Webhook not configured');
  }
  if (!valid) {
    console.warn('[airwallex webhook] invalid signature — rejecting');
    return res.status(400).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).send('Invalid JSON');
  }

  const eventName = event && event.name;
  const intentId = event && event.data && event.data.object && event.data.object.id;
  const rawStatus = event && event.data && event.data.object && event.data.object.status;
  const newStatus = TERMINAL_STATUS_BY_EVENT[eventName];

  // Events we don't map to a terminal status (e.g. payment_intent.created,
  // payment_attempt.* progress events) are acknowledged but otherwise
  // ignored — Airwallex retries a webhook that doesn't return 2xx, so an
  // event we don't act on must still be answered with 200, not an error.
  if (!newStatus || !intentId) {
    return res.status(200).send('Ignored');
  }

  try {
    const result = await query(
      `UPDATE payment_transactions
       SET status = $1, gateway_raw_status = $2, updated_at = now()
       WHERE gateway_intent_id = $3
       RETURNING order_id`,
      [newStatus, rawStatus || null, intentId]
    );
    if (result.rows.length === 0) {
      console.warn('[airwallex webhook] no payment_transactions row for intent', intentId);
    }
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[airwallex webhook] failed to update transaction:', err);
    // 500 so Airwallex retries — this is our DB, not a bad event.
    return res.status(500).send('Internal error');
  }
}

module.exports = { handleAirwallexWebhook };
