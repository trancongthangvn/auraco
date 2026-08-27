const express = require('express');
const { query } = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const VALID_TYPES = ['percent', 'fixed'];

function toDiscount(row) {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    minOrder: Number(row.min_order),
    usageLimit: row.usage_limit,
    used: row.used,
    startDate: row.start_date,
    endDate: row.end_date,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ----------------------------------------------------------------------------
// PUBLIC: POST /discount-codes/validate
// ----------------------------------------------------------------------------
router.post('/validate', async (req, res) => {
  try {
    const { code, orderTotal } = req.body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'code is required' });
    }

    const total = orderTotal === undefined ? 0 : Number(orderTotal);
    if (Number.isNaN(total) || total < 0) {
      return res.status(400).json({ error: 'orderTotal must be a non-negative number' });
    }

    const result = await query(
      `SELECT * FROM discount_codes WHERE code = $1`,
      [code.trim().toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    const row = result.rows[0];

    if (!row.active) {
      return res.status(400).json({ error: 'Discount code is not active' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(row.start_date);
    const end = new Date(row.end_date);

    if (today < start || today > end) {
      return res.status(400).json({ error: 'Discount code is outside its valid date range' });
    }

    if (row.usage_limit > 0 && row.used >= row.usage_limit) {
      return res.status(400).json({ error: 'Discount code usage limit reached' });
    }

    if (Number(row.min_order) > 0 && total < Number(row.min_order)) {
      return res.status(400).json({
        error: `Order total must be at least ${Number(row.min_order).toFixed(2)} to use this code`,
      });
    }

    const discountAmount =
      row.type === 'percent'
        ? Math.round(total * (Number(row.value) / 100) * 100) / 100
        : Math.min(Number(row.value), total);

    return res.json({
      data: {
        ...toDiscount(row),
        discountAmount,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------------------------------
// ADMIN: GET /admin/discount-codes — list all
// ----------------------------------------------------------------------------
router.get('/admin/discount-codes', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM discount_codes ORDER BY created_at DESC`);
    return res.json({ data: result.rows.map(toDiscount) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------------------------------
// ADMIN: GET /admin/discount-codes/:id — single
// ----------------------------------------------------------------------------
router.get('/admin/discount-codes/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const result = await query(`SELECT * FROM discount_codes WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }
    return res.json({ data: toDiscount(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------------------------------
// ADMIN: POST /admin/discount-codes — create
// ----------------------------------------------------------------------------
router.post('/admin/discount-codes', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minOrder,
      usageLimit,
      startDate,
      endDate,
      active,
    } = req.body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'code is required' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    const numValue = Number(value);
    if (value === undefined || Number.isNaN(numValue) || numValue < 0) {
      return res.status(400).json({ error: 'value must be a non-negative number' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'startDate/endDate must be valid dates' });
    }
    if (end < start) {
      return res.status(400).json({ error: 'endDate must not be before startDate' });
    }

    const numMinOrder = minOrder === undefined ? 0 : Number(minOrder);
    if (Number.isNaN(numMinOrder) || numMinOrder < 0) {
      return res.status(400).json({ error: 'minOrder must be a non-negative number' });
    }
    const numUsageLimit = usageLimit === undefined ? 0 : Number(usageLimit);
    if (!Number.isInteger(numUsageLimit) || numUsageLimit < 0) {
      return res.status(400).json({ error: 'usageLimit must be a non-negative integer' });
    }

    const result = await query(
      `INSERT INTO discount_codes
         (code, type, value, min_order, usage_limit, start_date, end_date, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        code.trim().toUpperCase(),
        type,
        numValue,
        numMinOrder,
        numUsageLimit,
        startDate,
        endDate,
        active === undefined ? true : Boolean(active),
      ]
    );

    return res.status(201).json({ data: toDiscount(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A discount code with this code already exists' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------------------------------
// ADMIN: PUT /admin/discount-codes/:id — update
// ----------------------------------------------------------------------------
router.put('/admin/discount-codes/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const existing = await query(`SELECT * FROM discount_codes WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }
    const current = existing.rows[0];

    const {
      code,
      type,
      value,
      minOrder,
      usageLimit,
      used,
      startDate,
      endDate,
      active,
    } = req.body || {};

    if (code !== undefined && (typeof code !== 'string' || !code.trim())) {
      return res.status(400).json({ error: 'code must be a non-empty string' });
    }
    if (type !== undefined && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (value !== undefined && (Number.isNaN(Number(value)) || Number(value) < 0)) {
      return res.status(400).json({ error: 'value must be a non-negative number' });
    }
    if (minOrder !== undefined && (Number.isNaN(Number(minOrder)) || Number(minOrder) < 0)) {
      return res.status(400).json({ error: 'minOrder must be a non-negative number' });
    }
    if (
      usageLimit !== undefined &&
      (!Number.isInteger(Number(usageLimit)) || Number(usageLimit) < 0)
    ) {
      return res.status(400).json({ error: 'usageLimit must be a non-negative integer' });
    }
    if (used !== undefined && (!Number.isInteger(Number(used)) || Number(used) < 0)) {
      return res.status(400).json({ error: 'used must be a non-negative integer' });
    }

    const nextStart = startDate !== undefined ? startDate : current.start_date;
    const nextEnd = endDate !== undefined ? endDate : current.end_date;
    if (startDate !== undefined || endDate !== undefined) {
      const start = new Date(nextStart);
      const end = new Date(nextEnd);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ error: 'startDate/endDate must be valid dates' });
      }
      if (end < start) {
        return res.status(400).json({ error: 'endDate must not be before startDate' });
      }
    }

    const result = await query(
      `UPDATE discount_codes SET
         code        = $1,
         type        = $2,
         value       = $3,
         min_order   = $4,
         usage_limit = $5,
         used        = $6,
         start_date  = $7,
         end_date    = $8,
         active      = $9,
         updated_at  = now()
       WHERE id = $10
       RETURNING *`,
      [
        code !== undefined ? code.trim().toUpperCase() : current.code,
        type !== undefined ? type : current.type,
        value !== undefined ? Number(value) : current.value,
        minOrder !== undefined ? Number(minOrder) : current.min_order,
        usageLimit !== undefined ? Number(usageLimit) : current.usage_limit,
        used !== undefined ? Number(used) : current.used,
        nextStart,
        nextEnd,
        active !== undefined ? Boolean(active) : current.active,
        id,
      ]
    );

    return res.json({ data: toDiscount(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A discount code with this code already exists' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------------------------------
// ADMIN: PUT /admin/discount-codes/:id/toggle — flip active flag
// ----------------------------------------------------------------------------
router.put('/admin/discount-codes/:id/toggle', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const result = await query(
      `UPDATE discount_codes
         SET active = NOT active, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    return res.json({ data: toDiscount(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------------------------------
// ADMIN: DELETE /admin/discount-codes/:id
// ----------------------------------------------------------------------------
router.delete('/admin/discount-codes/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const result = await query(`DELETE FROM discount_codes WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    return res.json({ data: { id } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
