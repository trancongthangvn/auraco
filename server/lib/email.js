// server/lib/email.js
//
// Two transactional emails via Resend: the order-confirmation email, fired
// once right after an order is created (see POST /orders in
// routes/orders-payments.js), and the welcome email, fired once a newsletter
// signup email has been validated as new (see routes/newsletter.js). Both
// are non-blocking - by the time either fires, the thing it is confirming
// (the order, or the signup row) is already committed, so an email failure
// (bad API key, Resend outage, unverified domain) must never fail or delay
// that response, only get logged.
//
// Needs two env vars to actually send (see .env.example):
//   RESEND_API_KEY  from resend.com's dashboard
//   EMAIL_FROM      a "Name <address@domain>" string on a domain verified
//                    in that Resend account (SPF/DKIM records added to the
//                    domain's DNS) - sending from an unverified domain is
//                    rejected by Resend, or silently lands in spam.
//
// Until RESEND_API_KEY is set, both send functions log a warning and return
// without throwing, so neither checkout nor the signup form is affected.

const { Resend } = require('resend');

let client = null;
function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

// order.total and order_items.price are both USD (see schema.sql's comment
// on order_items.price — "unit price snapshot" — and CheckoutClient.tsx's
// own `USD ${total.toFixed(2)}`), so this matches the storefront's own
// formatting rather than a locale-specific one.
function formatUsd(n) {
  return `USD ${Number(n).toFixed(2)}`;
}

// Spelled out with a month name (not MM/DD or DD/MM) since the storefront's
// customers aren't assumed to share one date-order convention.
function formatLongDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// Matches the domain set up in app/layout.tsx's own SITE_URL — this file has
// no access to that constant (separate CommonJS backend, see AGENTS.md-style
// split noted in DEPLOYMENT.md), so it's repeated here rather than shared.
const SITE_URL = 'https://aetherpieces.com';

// `promo` is the { code, value, endDate } returned by lib/discounts.js's
// createThankYouDiscount(), or null/undefined when generating one failed —
// the email renders the same either way, just without this block.
//
// Layout follows a requested reference template: a light page background
// behind a white card, a bold order-received heading, order total ahead of
// the item table, a payment-status line, and a single dark CTA button before
// the sign-off — rather than the plain flowing text this used to be.
function renderOrderConfirmationHtml(order, promo) {
  const itemRows = (order.items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${it.name}${it.material ? ` — ${it.material}` : ''}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${it.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatUsd(it.price)}</td>
      </tr>`
    )
    .join('');

  const promoBlock = promo
    ? `
      <div style="margin:0 0 20px;padding:16px;border:1px dashed #111;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;color:#555;">Thank you for your purchase! Here's a ${promo.value}% discount code just for you, for your next order:</p>
        <p style="margin:0;font-size:20px;font-weight:bold;letter-spacing:2px;">${promo.code}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#888;">Valid until ${formatLongDate(promo.endDate)}</p>
      </div>`
    : '';

  return `
  <div style="background:#f4f4f4;padding:32px 16px;font-family:Georgia,serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;color:#111;">
      <p style="margin:0 0 24px;text-align:center;font-size:18px;font-weight:normal;letter-spacing:2px;text-transform:uppercase;">AETHER</p>

      <h1 style="margin:0 0 16px;font-size:20px;font-weight:normal;">Order #${order.order_code} received</h1>

      <p style="margin:0 0 4px;">Hi ${order.customer_name},</p>
      <p style="margin:0 0 20px;">Thank you for your order at <strong>AETHER</strong>. We have received your order and it is being processed.</p>

      <p style="margin:0 0 16px;font-size:15px;"><strong>Order total: ${formatUsd(order.total)}</strong></p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;border-bottom:1px solid #111;padding-bottom:8px;">Item</th>
            <th style="text-align:center;border-bottom:1px solid #111;padding-bottom:8px;">Qty</th>
            <th style="text-align:right;border-bottom:1px solid #111;padding-bottom:8px;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <p style="margin:0 0 20px;font-size:13px;color:#555;">Shipping to: ${order.address}, ${order.city}${order.country ? `, ${order.country}` : ''}</p>

      ${promoBlock}

      <p style="margin:0 0 24px;font-size:14px;color:#555;">Your payment is being reviewed. We will email you once your order is confirmed.</p>

      <div style="text-align:center;margin:0 0 24px;">
        <a href="${SITE_URL}/thankyou?order=${encodeURIComponent(order.order_code)}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:12px 32px;font-size:13px;letter-spacing:1px;text-transform:uppercase;">View order</a>
      </div>

      <p style="margin:0;font-size:14px;">Thanks,<br/>AETHER</p>
    </div>
    <p style="text-align:center;font-size:11px;color:#999;margin:16px 0 0;">© ${new Date().getFullYear()} AETHER. All rights reserved.</p>
  </div>`;
}

async function sendOrderConfirmationEmail(order, promo) {
  const resend = getClient();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set - skipping order confirmation email for', order.order_code);
    return;
  }
  const from = process.env.EMAIL_FROM || 'AETHER <orders@aetherpieces.com>';
  try {
    await resend.emails.send({
      from,
      to: order.email,
      subject: `Order Confirmation ${order.order_code} - AETHER`,
      html: renderOrderConfirmationHtml(order, promo),
    });
  } catch (err) {
    // Never let an email failure surface as an order-creation failure.
    console.error('[email] Failed to send order confirmation for', order.order_code, err);
  }
}

// `promo` is the { code, value, endDate } returned by lib/discounts.js's
// createWelcomeDiscount() - the caller (routes/newsletter.js) only calls
// this when that succeeded, so unlike the order-confirmation email there is
// no null-promo case to render here.
function renderWelcomeHtml(promo) {
  return `
  <div style="background:#f4f4f4;padding:32px 16px;font-family:Georgia,serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;color:#111;text-align:center;">
      <p style="margin:0 0 24px;font-size:18px;font-weight:normal;letter-spacing:2px;text-transform:uppercase;">AETHER</p>

      <h1 style="margin:0 0 16px;font-size:20px;font-weight:normal;">Welcome to AETHER</h1>

      <p style="margin:0 0 20px;">Thanks for signing up. Here is your ${promo.value}% off code for your first order:</p>

      <div style="margin:0 0 20px;padding:16px;border:1px dashed #111;">
        <p style="margin:0;font-size:20px;font-weight:bold;letter-spacing:2px;">${promo.code}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#888;">Valid until ${formatLongDate(promo.endDate)}</p>
      </div>

      <div style="margin:0 0 24px;">
        <a href="${SITE_URL}/" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:12px 32px;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Shop now</a>
      </div>

      <p style="margin:0;font-size:14px;">Thanks,<br/>AETHER</p>
    </div>
    <p style="text-align:center;font-size:11px;color:#999;margin:16px 0 0;">© ${new Date().getFullYear()} AETHER. All rights reserved.</p>
  </div>`;
}

async function sendWelcomeEmail(email, promo) {
  const resend = getClient();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set - skipping welcome email for', email);
    return;
  }
  const from = process.env.EMAIL_FROM || 'AETHER <orders@aetherpieces.com>';
  try {
    await resend.emails.send({
      from,
      to: email,
      subject: 'Welcome to AETHER - Here is your 10% off',
      html: renderWelcomeHtml(promo),
    });
  } catch (err) {
    // Never let an email failure surface as a signup failure.
    console.error('[email] Failed to send welcome email for', email, err);
  }
}

const RESET_TOKEN_VALID_MINUTES = 60;

// `token` is the one-time plain token generated by POST /account/forgot-password
// (routes/account.js stores only its sha256 hash, so this is the only place
// the usable value exists outside that one request).
function renderPasswordResetHtml(resetUrl) {
  return `
  <div style="background:#f4f4f4;padding:32px 16px;font-family:Georgia,serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;color:#111;">
      <p style="margin:0 0 24px;text-align:center;font-size:18px;font-weight:normal;letter-spacing:2px;text-transform:uppercase;">AETHER</p>

      <h1 style="margin:0 0 16px;font-size:20px;font-weight:normal;">Hello!</h1>

      <p style="margin:0 0 20px;">You are receiving this email because we received a password reset request for your account.</p>

      <div style="text-align:center;margin:0 0 24px;">
        <a href="${resetUrl}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:12px 32px;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Reset Password</a>
      </div>

      <p style="margin:0 0 16px;font-size:14px;color:#555;">This password reset link will expire in ${RESET_TOKEN_VALID_MINUTES} minutes.</p>
      <p style="margin:0 0 24px;font-size:14px;color:#555;">If you did not request a password reset, no further action is required.</p>

      <p style="margin:0 0 24px;font-size:14px;">Regards,<br/>AETHER</p>

      <p style="margin:0;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px;">If you're having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser: <a href="${resetUrl}" style="color:#888;word-break:break-all;">${resetUrl}</a></p>
    </div>
    <p style="text-align:center;font-size:11px;color:#999;margin:16px 0 0;">© ${new Date().getFullYear()} AETHER. All rights reserved.</p>
  </div>`;
}

async function sendPasswordResetEmail(email, token) {
  const resend = getClient();
  const resetUrl = `${SITE_URL}/reset-password/${token}?email=${encodeURIComponent(email)}`;
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set - skipping password reset email for', email);
    return;
  }
  const from = process.env.EMAIL_FROM || 'AETHER <orders@aetherpieces.com>';
  try {
    await resend.emails.send({
      from,
      to: email,
      subject: 'Reset your AETHER password',
      html: renderPasswordResetHtml(resetUrl),
    });
  } catch (err) {
    // Never let an email failure surface as a forgot-password failure.
    console.error('[email] Failed to send password reset email for', email, err);
  }
}

module.exports = { sendOrderConfirmationEmail, sendWelcomeEmail, sendPasswordResetEmail };
