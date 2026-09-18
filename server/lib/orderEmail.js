// server/lib/orderEmail.js
//
// One way in for the order-confirmation ("thank you") email, shared by every
// place that can learn a payment succeeded: the PayPal capture, the Airwallex
// webhook, an admin marking a transfer received, and order creation itself
// for methods that have no confirmation step at all.
//
// Two things belong here rather than at each call site:
//
//   1. Send-once. Several of those callers can fire repeatedly for the same
//      order (Airwallex retries its webhook until it gets a 2xx; an admin can
//      re-save a transaction). The timestamp added in migration 026 is
//      claimed with a conditional UPDATE, so exactly one caller wins the race
//      and the customer gets one email.
//   2. Failure rolls the claim back, so a send that never happened (Resend
//      key missing, API down) can still go out when the next confirmation
//      arrives instead of being permanently marked as sent.

const { query } = require('../db');
const { sendOrderConfirmationEmail } = require('./email');
const { createThankYouDiscount } = require('./discounts');

const ORDER_ITEMS_SQL = `
  SELECT oi.*, p.slug AS product_slug
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
   WHERE oi.order_id = $1
   ORDER BY oi.id`;

/**
 * Sends the confirmation email for an order, at most once ever.
 * Never throws: callers are payment paths whose own response must not fail
 * because an email did. Returns true only if an email was actually sent.
 */
async function sendOrderConfirmationOnce(orderId) {
  try {
    // Claim and read the order in one statement — whoever updates the row
    // from NULL is the single sender, everyone else gets zero rows back.
    const claim = await query(
      `UPDATE orders
          SET confirmation_email_sent_at = now()
        WHERE id = $1 AND confirmation_email_sent_at IS NULL
        RETURNING *`,
      [orderId]
    );
    const order = claim.rows[0];
    if (!order) return false; // already sent, or no such order

    const itemsRes = await query(ORDER_ITEMS_SQL, [order.id]);
    const fullOrder = { ...order, items: itemsRes.rows };

    // A failure here only means the email carries no promo block
    // (createThankYouDiscount never throws — see lib/discounts.js).
    const promo = await createThankYouDiscount();
    const sent = await sendOrderConfirmationEmail(fullOrder, promo);
    if (!sent) {
      await query(`UPDATE orders SET confirmation_email_sent_at = NULL WHERE id = $1`, [order.id]);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[orderEmail] confirmation email failed for order', orderId, err);
    // Best-effort release of the claim; if this also fails the order simply
    // keeps a timestamp for an email that was not sent, which is why the
    // send path above releases it explicitly on the common failures.
    await query(`UPDATE orders SET confirmation_email_sent_at = NULL WHERE id = $1`, [orderId]).catch(
      () => {}
    );
    return false;
  }
}

module.exports = { sendOrderConfirmationOnce };
