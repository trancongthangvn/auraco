// server/routes/account.js — storefront customer accounts, mounted at
// /api/account. Sign up / sign in with email + password, view and edit the
// basic profile, change password, and list the orders placed while signed in.
//
// Every response uses toPublicCustomer, so password_hash never leaves here.

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../db');
const { signCustomerToken, requireCustomer } = require('../lib/customerAuth');
const { sendPasswordResetEmail } = require('../lib/email');

const router = express.Router();

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_VALID_MINUTES = 60;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function toPublicCustomer(c) {
  return {
    id: c.id,
    email: c.email,
    full_name: c.full_name,
    phone: c.phone,
    created_at: c.created_at,
  };
}

// POST /api/account/register  { full_name, email, password }
router.post('/register', async (req, res) => {
  const fullName = str(req.body && req.body.full_name);
  const email = str(req.body && req.body.email).toLowerCase();
  const password = req.body && req.body.password;

  if (!fullName) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters.` });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO customers (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (lower(email)) DO NOTHING
       RETURNING *`,
      [email, hash, fullName.slice(0, 160)]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }
    const customer = result.rows[0];
    return res.status(201).json({ data: { token: signCustomerToken(customer), customer: toPublicCustomer(customer) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not create your account. Please try again.' });
  }
});

// POST /api/account/login  { email, password }
router.post('/login', async (req, res) => {
  const email = str(req.body && req.body.email).toLowerCase();
  const password = req.body && req.body.password;
  // Same message for an unknown email and a wrong password, so the form
  // can't be used to find out which addresses have accounts.
  const invalid = () => res.status(401).json({ error: 'Incorrect email or password.' });
  if (!email || typeof password !== 'string' || !password) return invalid();

  try {
    const result = await query(`SELECT * FROM customers WHERE lower(email) = $1`, [email]);
    const customer = result.rows[0];
    if (!customer || !(await bcrypt.compare(password, customer.password_hash))) return invalid();
    return res.json({ data: { token: signCustomerToken(customer), customer: toPublicCustomer(customer) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not sign you in. Please try again.' });
  }
});

// GET /api/account/me
router.get('/me', requireCustomer, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM customers WHERE id = $1`, [req.customerId]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Please sign in to continue.' });
    return res.json({ data: toPublicCustomer(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load your account.' });
  }
});

// PUT /api/account/me  { full_name, phone }
// Email is not editable here: with no verification step it would let an
// account take over an address it doesn't own.
router.put('/me', requireCustomer, async (req, res) => {
  const fullName = str(req.body && req.body.full_name);
  const phone = str(req.body && req.body.phone);
  if (!fullName) return res.status(400).json({ error: 'Please enter your full name.' });
  if (phone.length > 40) return res.status(400).json({ error: 'Phone number is too long.' });
  try {
    const result = await query(
      `UPDATE customers SET full_name = $1, phone = $2, updated_at = now() WHERE id = $3 RETURNING *`,
      [fullName.slice(0, 160), phone || null, req.customerId]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Please sign in to continue.' });
    return res.json({ data: toPublicCustomer(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not save your details.' });
  }
});

// POST /api/account/change-password  { current_password, new_password }
router.post('/change-password', requireCustomer, async (req, res) => {
  const current = req.body && req.body.current_password;
  const next = req.body && req.body.new_password;
  if (typeof next !== 'string' || next.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD} characters.` });
  }
  try {
    const result = await query(`SELECT password_hash FROM customers WHERE id = $1`, [req.customerId]);
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: 'Please sign in to continue.' });
    if (typeof current !== 'string' || !(await bcrypt.compare(current, row.password_hash))) {
      return res.status(400).json({ error: 'Your current password is incorrect.' });
    }
    await query(`UPDATE customers SET password_hash = $1, updated_at = now() WHERE id = $2`, [
      await bcrypt.hash(next, 10),
      req.customerId,
    ]);
    return res.json({ data: { ok: true } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not change your password.' });
  }
});

// POST /api/account/forgot-password  { email }
//
// Always responds the same way whether or not the address has an account -
// same reasoning as login's "Incorrect email or password" for either case:
// this endpoint must not be usable to find out who has an account.
router.post('/forgot-password', async (req, res) => {
  const email = str(req.body && req.body.email).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  try {
    const result = await query(`SELECT id, email FROM customers WHERE lower(email) = $1`, [email]);
    const customer = result.rows[0];
    if (customer) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_VALID_MINUTES * 60 * 1000);
      await query(
        `INSERT INTO password_resets (customer_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [customer.id, hashResetToken(token), expiresAt]
      );
      sendPasswordResetEmail(customer.email, token).catch(() => {});
    }
    return res.json({ data: { ok: true } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not process your request. Please try again.' });
  }
});

// POST /api/account/reset-password  { email, token, new_password }
router.post('/reset-password', async (req, res) => {
  const email = str(req.body && req.body.email).toLowerCase();
  const token = str(req.body && req.body.token);
  const newPassword = req.body && req.body.new_password;
  const invalid = () => res.status(400).json({ error: 'This reset link is invalid or has expired.' });

  if (!EMAIL_RE.test(email) || !token) return invalid();
  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters.` });
  }

  try {
    const customerRes = await query(`SELECT id FROM customers WHERE lower(email) = $1`, [email]);
    const customer = customerRes.rows[0];
    if (!customer) return invalid();

    const resetRes = await query(
      `SELECT id FROM password_resets
        WHERE customer_id = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > now()`,
      [customer.id, hashResetToken(token)]
    );
    const reset = resetRes.rows[0];
    if (!reset) return invalid();

    await query(`UPDATE customers SET password_hash = $1, updated_at = now() WHERE id = $2`, [
      await bcrypt.hash(newPassword, 10),
      customer.id,
    ]);
    await query(`UPDATE password_resets SET used_at = now() WHERE id = $1`, [reset.id]);

    return res.json({ data: { ok: true } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not reset your password. Please try again.' });
  }
});

// GET /api/account/orders — orders placed while signed in to this account,
// newest first, each with its items. Only orders.customer_id is used, never
// a match on email (see migration 025 for why).
router.get('/orders', requireCustomer, async (req, res) => {
  try {
    const ordersRes = await query(
      `SELECT id, order_code, status, payment_method, subtotal, discount_amount, shipping_fee,
              tax_amount, total, address, city, postal_code, country, created_at
         FROM orders
        WHERE customer_id = $1
        ORDER BY created_at DESC
        LIMIT 200`,
      [req.customerId]
    );
    const ids = ordersRes.rows.map((o) => o.id);
    const itemsRes = ids.length
      ? await query(
          `SELECT oi.order_id, oi.id, oi.name, oi.material, oi.price, oi.qty, oi.image_url, p.slug AS product_slug
             FROM order_items oi
             LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ANY($1::int[])
            ORDER BY oi.id`,
          [ids]
        )
      : { rows: [] };
    const byOrder = new Map();
    for (const it of itemsRes.rows) {
      if (!byOrder.has(it.order_id)) byOrder.set(it.order_id, []);
      byOrder.get(it.order_id).push(it);
    }
    return res.json({ data: ordersRes.rows.map((o) => ({ ...o, items: byOrder.get(o.id) || [] })) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load your orders.' });
  }
});

module.exports = router;
