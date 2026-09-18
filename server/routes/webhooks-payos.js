// server/routes/webhooks-payos.js
//
// Handles PayOS's webhook callback — the trustworthy signal that a payment
// actually succeeded (never the shopper's browser return alone, which can
// be replayed, skipped, or forged; see POST /orders/:id/payos-confirm for
// the same reasoning applied to the browser-return path).
//
// Unlike Airwallex's webhook (routes/webhooks-airwallex.js), PayOS signs
// the structured JSON payload itself (fields sorted alphabetically, HMAC'd
// with the Checksum Key) rather than the raw request bytes, so this is a
// normal express.json()-parsed route — no special raw-body mounting needed.
// Verification is delegated to the official @payos/node SDK
// (lib/payos.js#verifyWebhook) rather than reimplemented here; see that
// file's header comment for why.
//
// PayOS's webhook fires once, on a confirmed payment — there is no
// separate "failed" event to map here (a payment that's never completed
// just never gets a webhook), unlike Airwallex's payment_intent.failed.

const express = require('express');
const { query } = require('../db');
const payos = require('../lib/payos');
const { sendOrderConfirmationOnce } = require('../lib/orderEmail');

const router = express.Router();

router.post('/webhooks/payos', async (req, res) => {
  let verified;
  try {
    verified = await payos.verifyWebhook(req.body);
  } catch (err) {
    console.warn('[payos webhook] signature check failed:', err.message);
    // 200 either way: PayOS retries a webhook that doesn't get a 2xx, and a
    // bad signature will never become good on retry — nothing to gain from
    // making it try again.
    return res.status(200).send('Ignored');
  }

  // The SDK's verify() may return either the verified `data` object
  // directly or the whole verified payload depending on version — accept
  // either shape rather than assuming one.
  const data = verified && verified.orderCode !== undefined ? verified : verified && verified.data;
  const orderId = data && Number(data.orderCode);
  if (!orderId || !Number.isInteger(orderId)) {
    return res.status(200).send('Ignored');
  }

  try {
    const result = await query(
      `UPDATE payment_transactions
          SET status = 'Đã thanh toán', gateway_raw_status = 'PAID', updated_at = now()
        WHERE order_id = $1 AND method = 'payos'
        RETURNING order_id`,
      [orderId]
    );
    if (result.rows.length === 0) {
      console.warn('[payos webhook] no payos payment_transactions row for order', orderId);
    } else {
      // Retried deliveries and the browser-return confirm (payos-confirm)
      // can both reach this same order — sendOrderConfirmationOnce is what
      // keeps that to a single email. Not awaited: the 200 below must not
      // wait on mail.
      sendOrderConfirmationOnce(orderId).catch(() => {});
    }
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[payos webhook] failed to update transaction:', err);
    // 500 so PayOS retries — this is our DB, not a bad event.
    return res.status(500).send('Internal error');
  }
});

module.exports = router;
