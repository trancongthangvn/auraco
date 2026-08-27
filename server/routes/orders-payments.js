const path = require('path');
const fs = require('fs');
const express = require('express');
const { pool, query } = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { upload, verifyMagicBytes } = require('../lib/upload');

const router = express.Router();

// ----------------------------------------------------------------------------
// Constants mirrored from schema.sql CHECK constraints
// ----------------------------------------------------------------------------
const ORDER_STATUSES = ['Đang xử lý', 'Đã giao', 'Đã hủy'];
const PAYMENT_METHODS = ['card', 'paypal', 'cashapp', 'zelle'];
const TRANSACTION_STATUSES = ['Chờ xử lý', 'Đã thanh toán', 'Thất bại', 'Đã hủy'];
const PAYMENT_METHOD_KEYS = ['card', 'paypal', 'applePay', 'cashapp', 'zelle'];

// Convenience English aliases accepted from admin clients, mapped onto the
// exact Vietnamese enum values the schema's CHECK constraints require.
// (No literal "refunded" state exists in payment_transactions.status — the
// closest schema-supported outcome is 'Đã hủy' (cancelled), used here for it.)
const TRANSACTION_STATUS_ALIASES = {
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hủy',
  cancelled: 'Đã hủy',
  canceled: 'Đã hủy',
};

const ORDER_STATUS_ALIASES = {
  pending: 'Đang xử lý',
  processing: 'Đang xử lý',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  canceled: 'Đã hủy',
};

function resolveEnum(value, aliases, allowed) {
  if (typeof value !== 'string') return null;
  if (allowed.includes(value)) return value;
  const mapped = aliases[value.toLowerCase()];
  return mapped || null;
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function toNumber(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// ============================================================================
// Orders
// ============================================================================

// ----------------------------------------------------------------------------
// POST /orders — create an order + its order_items in one transaction.
// Body: {
//   customer_name, email, phone, address, city, country?,
//   payment_method: 'card'|'paypal'|'cashapp'|'zelle',
//   shipping_fee?, discount_code?,
//   items: [{ product_id, qty }]
// }
// Assumption: the client sends product_id + qty per line; the server looks
// up each product's current name/material/price/image to snapshot into
// order_items (per schema.sql's comment that order_items snapshots those
// fields at purchase time), rather than trusting client-supplied price data.
// ----------------------------------------------------------------------------
router.post('/orders', async (req, res) => {
  const {
    customer_name,
    email,
    phone,
    address,
    city,
    country,
    payment_method,
    shipping_fee,
    discount_code,
    items,
  } = req.body || {};

  if (!isNonEmptyString(customer_name)) return res.status(400).json({ error: 'customer_name is required' });
  if (!isNonEmptyString(email)) return res.status(400).json({ error: 'email is required' });
  if (!isNonEmptyString(phone)) return res.status(400).json({ error: 'phone is required' });
  if (!isNonEmptyString(address)) return res.status(400).json({ error: 'address is required' });
  if (!isNonEmptyString(city)) return res.status(400).json({ error: 'city is required' });
  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({ error: `payment_method must be one of: ${PAYMENT_METHODS.join(', ')}` });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  for (const it of items) {
    if (!it || typeof it.product_id === 'undefined' || !Number.isFinite(toNumber(it.qty)) || toNumber(it.qty) <= 0) {
      return res.status(400).json({ error: 'each item requires product_id and a positive integer qty' });
    }
  }

  const shippingFeeNum = shipping_fee === undefined || shipping_fee === null ? 0 : toNumber(shipping_fee);
  if (shippingFeeNum === null || shippingFeeNum < 0) {
    return res.status(400).json({ error: 'shipping_fee must be a non-negative number' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve product snapshots
    const productIds = items.map((it) => it.product_id);
    const prodRes = await client.query(
      `SELECT id, name, material, price, images FROM products WHERE id = ANY($1::int[])`,
      [productIds]
    );
    const productMap = new Map(prodRes.rows.map((p) => [p.id, p]));

    let subtotal = 0;
    const lineItems = [];
    for (const it of items) {
      const product = productMap.get(Number(it.product_id));
      if (!product) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Product ${it.product_id} not found` });
      }
      const qty = Math.trunc(toNumber(it.qty));
      const unitPrice = parseFloat(product.price);
      subtotal += unitPrice * qty;
      const images = Array.isArray(product.images) ? product.images : [];
      lineItems.push({
        product_id: product.id,
        name: product.name,
        material: product.material,
        price: unitPrice,
        qty,
        image_url: images.length > 0 ? images[0] : null,
      });
    }

    // Optional discount code
    let discountAmount = 0;
    let discountCodeId = null;
    if (isNonEmptyString(discount_code)) {
      const dcRes = await client.query(
        `SELECT * FROM discount_codes
         WHERE code = $1 AND active = TRUE
           AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE`,
        [discount_code.trim()]
      );
      const dc = dcRes.rows[0];
      if (!dc) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid or expired discount code' });
      }
      if (dc.usage_limit > 0 && dc.used >= dc.usage_limit) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Discount code usage limit reached' });
      }
      if (subtotal < parseFloat(dc.min_order)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Order subtotal must be at least ${dc.min_order} to use this code` });
      }
      discountAmount =
        dc.type === 'percent' ? (subtotal * parseFloat(dc.value)) / 100 : Math.min(parseFloat(dc.value), subtotal);
      discountCodeId = dc.id;
    }

    const total = Math.max(0, subtotal + shippingFeeNum - discountAmount);

    // Generate order_code from the id sequence so it's assigned atomically
    // and matches the row's id (e.g. id 1042 -> 'AC-1042').
    const seqRes = await client.query(`SELECT nextval(pg_get_serial_sequence('orders', 'id')) AS id`);
    const newId = seqRes.rows[0].id;
    const orderCode = `AC-${newId}`;

    const orderRes = await client.query(
      `INSERT INTO orders
        (id, order_code, customer_name, email, phone, address, city, country,
         subtotal, shipping_fee, discount_amount, total, discount_code_id, status, payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'Vietnam'),$9,$10,$11,$12,$13,'Đang xử lý',$14)
       RETURNING *`,
      [
        newId,
        orderCode,
        customer_name.trim(),
        email.trim(),
        phone.trim(),
        address.trim(),
        city.trim(),
        isNonEmptyString(country) ? country.trim() : null,
        subtotal.toFixed(2),
        shippingFeeNum.toFixed(2),
        discountAmount.toFixed(2),
        total.toFixed(2),
        discountCodeId,
        payment_method,
      ]
    );
    const order = orderRes.rows[0];

    for (const li of lineItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, material, price, qty, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, li.product_id, li.name, li.material, li.price, li.qty, li.image_url]
      );
    }

    if (discountCodeId) {
      await client.query(`UPDATE discount_codes SET used = used + 1, updated_at = now() WHERE id = $1`, [
        discountCodeId,
      ]);
    }

    await client.query('COMMIT');

    const itemsRes = await query(`SELECT * FROM order_items WHERE order_id = $1`, [order.id]);
    return res.status(201).json({ data: { ...order, items: itemsRes.rows } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    return res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------------
// GET /orders/:id — public order lookup (by numeric id or order_code).
// ----------------------------------------------------------------------------
router.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const isNumeric = /^\d+$/.test(id);
    const orderRes = await query(
      isNumeric ? `SELECT * FROM orders WHERE id = $1` : `SELECT * FROM orders WHERE order_code = $1`,
      [isNumeric ? Number(id) : id]
    );
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const itemsRes = await query(`SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`, [order.id]);
    return res.json({ data: { ...order, items: itemsRes.rows } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ----------------------------------------------------------------------------
// GET /admin/orders — admin list + filter.
// Query params: status, payment_method, email, q (order_code/customer_name),
// page, limit
// ----------------------------------------------------------------------------
router.get('/admin/orders', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status, payment_method, email, q } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const clauses = [];
    const params = [];

    if (status) {
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${ORDER_STATUSES.join(', ')}` });
      }
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }
    if (payment_method) {
      if (!PAYMENT_METHODS.includes(payment_method)) {
        return res.status(400).json({ error: `payment_method must be one of: ${PAYMENT_METHODS.join(', ')}` });
      }
      params.push(payment_method);
      clauses.push(`payment_method = $${params.length}`);
    }
    if (email) {
      params.push(`%${email}%`);
      clauses.push(`email ILIKE $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      clauses.push(`(order_code ILIKE $${idx} OR customer_name ILIKE $${idx})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*)::int AS count FROM orders ${where}`, params);
    const listParams = [...params, limit, offset];
    const listRes = await query(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${
        params.length + 2
      }`,
      listParams
    );

    return res.json({
      data: {
        orders: listRes.rows,
        total: countRes.rows[0].count,
        page,
        limit,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to list orders' });
  }
});

// ----------------------------------------------------------------------------
// PUT /admin/orders/:id — admin status update.
// Body: { status: 'Đang xử lý' | 'Đã giao' | 'Đã hủy' (or English alias) }
// ----------------------------------------------------------------------------
router.put('/admin/orders/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid order id' });

  const resolvedStatus = resolveEnum(req.body && req.body.status, ORDER_STATUS_ALIASES, ORDER_STATUSES);
  if (!resolvedStatus) {
    return res.status(400).json({ error: `status must be one of: ${ORDER_STATUSES.join(', ')}` });
  }

  try {
    const result = await query(
      `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [resolvedStatus, Number(id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update order' });
  }
});

// ============================================================================
// Payments
// ============================================================================

// ----------------------------------------------------------------------------
// GET /payment-methods — public, only enabled methods (for checkout).
// ----------------------------------------------------------------------------
router.get('/payment-methods', async (req, res) => {
  try {
    const result = await query(
      `SELECT key, label, detail, qr_image_url FROM payment_method_settings WHERE enabled = TRUE ORDER BY key`
    );
    return res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// ----------------------------------------------------------------------------
// GET /admin/payment-methods — admin, all rows.
// ----------------------------------------------------------------------------
router.get('/admin/payment-methods', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM payment_method_settings ORDER BY key`);
    return res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// ----------------------------------------------------------------------------
// PUT /admin/payment-methods/:key — admin toggle enabled + edit detail fields.
// Body: { label?, enabled?, detail?, qr_image_url? }
// ----------------------------------------------------------------------------
router.put('/admin/payment-methods/:key', authMiddleware, requireAdmin, async (req, res) => {
  const { key } = req.params;
  if (!PAYMENT_METHOD_KEYS.includes(key)) {
    return res.status(400).json({ error: `key must be one of: ${PAYMENT_METHOD_KEYS.join(', ')}` });
  }
  const { label, enabled, detail, qr_image_url } = req.body || {};

  if (label === undefined && enabled === undefined && detail === undefined && qr_image_url === undefined) {
    return res.status(400).json({ error: 'At least one of label, enabled, detail, qr_image_url is required' });
  }
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  if (label !== undefined && !isNonEmptyString(label)) {
    return res.status(400).json({ error: 'label must be a non-empty string' });
  }
  if (detail !== undefined && typeof detail !== 'string') {
    return res.status(400).json({ error: 'detail must be a string' });
  }
  if (qr_image_url !== undefined && qr_image_url !== null && typeof qr_image_url !== 'string') {
    return res.status(400).json({ error: 'qr_image_url must be a string or null' });
  }

  try {
    // Ensure the row exists (upsert-by-key, since payment_method_settings
    // isn't guaranteed pre-seeded for every key).
    const existing = await query(`SELECT * FROM payment_method_settings WHERE key = $1`, [key]);
    if (existing.rows.length === 0) {
      if (label === undefined) {
        return res.status(404).json({ error: 'Payment method not found; provide label to create it' });
      }
      const created = await query(
        `INSERT INTO payment_method_settings (key, label, enabled, detail, qr_image_url)
         VALUES ($1,$2,COALESCE($3,FALSE),COALESCE($4,''),$5)
         RETURNING *`,
        [key, label, enabled ?? null, detail ?? null, qr_image_url ?? null]
      );
      return res.status(201).json({ data: created.rows[0] });
    }

    const current = existing.rows[0];
    const result = await query(
      `UPDATE payment_method_settings
       SET label = $1, enabled = $2, detail = $3, qr_image_url = $4
       WHERE key = $5
       RETURNING *`,
      [
        label !== undefined ? label : current.label,
        enabled !== undefined ? enabled : current.enabled,
        detail !== undefined ? detail : current.detail,
        qr_image_url !== undefined ? qr_image_url : current.qr_image_url,
        key,
      ]
    );
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// ----------------------------------------------------------------------------
// GET /admin/payment-transactions — admin list + filter.
// Query params: status, method, order_id, page, limit
// ----------------------------------------------------------------------------
router.get('/admin/payment-transactions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status, method, order_id } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const clauses = [];
    const params = [];

    if (status) {
      const resolved = resolveEnum(status, TRANSACTION_STATUS_ALIASES, TRANSACTION_STATUSES);
      if (!resolved) {
        return res.status(400).json({ error: `status must be one of: ${TRANSACTION_STATUSES.join(', ')}` });
      }
      params.push(resolved);
      clauses.push(`status = $${params.length}`);
    }
    if (method) {
      if (!PAYMENT_METHODS.includes(method)) {
        return res.status(400).json({ error: `method must be one of: ${PAYMENT_METHODS.join(', ')}` });
      }
      params.push(method);
      clauses.push(`method = $${params.length}`);
    }
    if (order_id) {
      if (!/^\d+$/.test(order_id)) return res.status(400).json({ error: 'order_id must be numeric' });
      params.push(Number(order_id));
      clauses.push(`order_id = $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*)::int AS count FROM payment_transactions ${where}`, params);
    const listParams = [...params, limit, offset];
    const listRes = await query(
      `SELECT * FROM payment_transactions ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${
        params.length + 2
      }`,
      listParams
    );

    return res.json({
      data: {
        transactions: listRes.rows,
        total: countRes.rows[0].count,
        page,
        limit,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to list payment transactions' });
  }
});

// ----------------------------------------------------------------------------
// POST /orders/:id/payment-proof — multipart upload of a Cash App/Zelle
// proof-of-payment image. Creates a payment_transactions row (status
// 'Chờ xử lý' i.e. pending) referencing the uploaded, server-named file.
// Field name: 'proof' (multipart/form-data), plus body field 'method'
// ('cashapp' | 'zelle').
// ----------------------------------------------------------------------------
router.post('/orders/:id/payment-proof', upload.single('proof'), async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Invalid order id' });
  }

  const method = req.body && req.body.method;
  if (!['cashapp', 'zelle'].includes(method)) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "method must be 'cashapp' or 'zelle'" });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'proof image file is required (field name: proof)' });
  }

  // Defense-in-depth: verify the written file's real bytes match its
  // declared MIME type, not just multer's client-reported header.
  if (!verifyMagicBytes(req.file.path, req.file.mimetype)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Uploaded file failed content verification' });
  }

  try {
    const orderRes = await query(`SELECT * FROM orders WHERE id = $1`, [Number(id)]);
    const order = orderRes.rows[0];
    if (!order) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Order not found' });
    }

    const proofUrl = `/uploads/${path.basename(req.file.path)}`;
    const txRes = await query(
      `INSERT INTO payment_transactions (order_id, method, amount, status, proof_image_url)
       VALUES ($1,$2,$3,'Chờ xử lý',$4)
       RETURNING *`,
      [order.id, method, order.total, proofUrl]
    );

    return res.status(201).json({ data: txRes.rows[0] });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error(err);
    return res.status(500).json({ error: 'Failed to record payment proof' });
  }
});

// ----------------------------------------------------------------------------
// PUT /admin/payment-transactions/:id — admin marks paid/failed/cancelled
// (also accepts 'refunded' as an alias for 'Đã hủy' — see note above; the
// schema has no distinct refunded state).
// Body: { status: 'paid'|'failed'|'refunded'|'cancelled' (or exact Vietnamese enum value) }
// ----------------------------------------------------------------------------
router.put('/admin/payment-transactions/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid transaction id' });

  const resolvedStatus = resolveEnum(req.body && req.body.status, TRANSACTION_STATUS_ALIASES, TRANSACTION_STATUSES);
  if (!resolvedStatus) {
    return res.status(400).json({ error: `status must be one of: ${TRANSACTION_STATUSES.join(', ')}` });
  }

  try {
    const result = await query(
      `UPDATE payment_transactions
       SET status = $1, reviewed_by = $2, reviewed_at = now(), updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [resolvedStatus, req.user.id, Number(id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment transaction not found' });

    // If marked paid, reflect that on the parent order too (best-effort;
    // orders.status has no dedicated "paid" state in schema.sql, so this
    // only updates payment_transactions — order fulfillment status is
    // managed separately via PUT /admin/orders/:id).
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update payment transaction' });
  }
});

module.exports = router;
