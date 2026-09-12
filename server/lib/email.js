// server/lib/email.js
//
// Order-confirmation email via Resend. Fires once, right after an order is
// created (see POST /orders in routes/orders-payments.js) — non-blocking:
// the order is already committed to the database by the time this runs, so
// an email failure (bad API key, Resend outage, unverified domain) must
// never fail or delay the order-creation response itself, only get logged.
//
// Needs two env vars to actually send (see .env.example):
//   RESEND_API_KEY  from resend.com's dashboard
//   EMAIL_FROM      a "Name <address@domain>" string on a domain verified
//                    in that Resend account (SPF/DKIM records added to the
//                    domain's DNS) — sending from an unverified domain is
//                    rejected by Resend, or silently lands in spam.
//
// Until RESEND_API_KEY is set, sendOrderConfirmationEmail() logs a warning
// and returns without throwing, so the rest of checkout is unaffected.

const { Resend } = require('resend');

let client = null;
function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

function formatVnd(n) {
  return `${Number(n).toLocaleString('vi-VN')}đ`;
}

function renderOrderConfirmationHtml(order) {
  const itemRows = (order.items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${it.name}${it.material ? ` — ${it.material}` : ''}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${it.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatVnd(it.price)}</td>
      </tr>`
    )
    .join('');

  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#111;">
    <h2 style="font-weight:normal;letter-spacing:1px;text-transform:uppercase;">AURA &amp; CO</h2>
    <p>Xin chào ${order.customer_name},</p>
    <p>Cảm ơn bạn đã đặt hàng. Đơn hàng <strong>${order.order_code}</strong> của bạn đã được ghi nhận.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <thead>
        <tr>
          <th style="text-align:left;border-bottom:1px solid #111;padding-bottom:8px;">Sản phẩm</th>
          <th style="text-align:center;border-bottom:1px solid #111;padding-bottom:8px;">SL</th>
          <th style="text-align:right;border-bottom:1px solid #111;padding-bottom:8px;">Giá</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <p style="text-align:right;font-size:15px;"><strong>Tổng cộng: ${formatVnd(order.total)}</strong></p>
    <p style="font-size:13px;color:#555;">Giao đến: ${order.address}, ${order.city}${order.country ? `, ${order.country}` : ''}</p>
    <p style="font-size:13px;color:#555;">Bạn có thể tra cứu đơn hàng bất cứ lúc nào bằng mã đơn và email này trên website AURA &amp; CO.</p>
  </div>`;
}

async function sendOrderConfirmationEmail(order) {
  const resend = getClient();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping order confirmation email for', order.order_code);
    return;
  }
  const from = process.env.EMAIL_FROM || 'AURA & CO <orders@aura.maxmin.vn>';
  try {
    await resend.emails.send({
      from,
      to: order.email,
      subject: `Xác nhận đơn hàng ${order.order_code} — AURA & CO`,
      html: renderOrderConfirmationHtml(order),
    });
  } catch (err) {
    // Never let an email failure surface as an order-creation failure.
    console.error('[email] Failed to send order confirmation for', order.order_code, err);
  }
}

module.exports = { sendOrderConfirmationEmail };
