const express = require('express');
const { query } = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// Inquiries (contact form submissions)
// ============================================================================

// POST /inquiries — public contact form submission
router.post('/inquiries', async (req, res) => {
  const { name, email, phone, subject, message } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'email is required' });
  }
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: 'subject is required' });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const result = await query(
      `INSERT INTO inquiries (name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), email.trim(), phone || null, subject.trim(), message.trim()]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

// GET /admin/inquiries — admin list (optional ?resolved=true|false filter)
router.get('/admin/inquiries', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { resolved } = req.query;
    let sql = 'SELECT * FROM inquiries';
    const params = [];

    if (resolved === 'true' || resolved === 'false') {
      params.push(resolved === 'true');
      sql += ` WHERE resolved = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

// PUT /admin/inquiries/:id — mark resolved/unresolved
router.put('/admin/inquiries/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { resolved } = req.body || {};

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid inquiry id' });
  }
  if (typeof resolved !== 'boolean') {
    return res.status(400).json({ error: 'resolved (boolean) is required' });
  }

  try {
    const result = await query(
      `UPDATE inquiries SET resolved = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [resolved, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

// DELETE /admin/inquiries/:id
router.delete('/admin/inquiries/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid inquiry id' });
  }

  try {
    const result = await query('DELETE FROM inquiries WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    return res.json({ data: { id: result.rows[0].id } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete inquiry' });
  }
});

// ============================================================================
// Product reviews
// ============================================================================

// POST /products/:slug/reviews — public: customer submits a review (pending)
router.post('/products/:slug/reviews', async (req, res) => {
  const { slug } = req.params;
  const { customerName, rating, comment } = req.body || {};

  if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
    return res.status(400).json({ error: 'customerName is required' });
  }
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
  }
  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    return res.status(400).json({ error: 'comment is required' });
  }

  try {
    const productResult = await query(
      'SELECT id, name FROM products WHERE slug = $1 AND active = TRUE',
      [slug]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productResult.rows[0];

    const result = await query(
      `INSERT INTO product_reviews (product_id, product_name, customer_name, rating, comment, status)
       VALUES ($1, $2, $3, $4, $5, 'Chờ duyệt')
       RETURNING *`,
      [product.id, product.name, customerName.trim(), ratingNum, comment.trim()]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /products/:slug/reviews — public: only approved reviews for a product
router.get('/products/:slug/reviews', async (req, res) => {
  const { slug } = req.params;

  try {
    const productResult = await query('SELECT id FROM products WHERE slug = $1', [slug]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const productId = productResult.rows[0].id;

    const result = await query(
      `SELECT * FROM product_reviews
       WHERE product_id = $1 AND status = 'Đã duyệt'
       ORDER BY created_at DESC`,
      [productId]
    );
    return res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /admin/reviews — admin list, optional ?status= filter
router.get('/admin/reviews', authMiddleware, requireAdmin, async (req, res) => {
  const VALID_STATUSES = ['Chờ duyệt', 'Đã duyệt', 'Từ chối'];
  const { status } = req.query;

  try {
    let sql = 'SELECT * FROM product_reviews';
    const params = [];

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }
      params.push(status);
      sql += ` WHERE status = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// PUT /admin/reviews/:id — update status (approve/reject/etc.)
router.put('/admin/reviews/:id', authMiddleware, requireAdmin, async (req, res) => {
  const VALID_STATUSES = ['Chờ duyệt', 'Đã duyệt', 'Từ chối'];
  const { id } = req.params;
  const { status } = req.body || {};

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid review id' });
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const result = await query(
      `UPDATE product_reviews SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update review' });
  }
});

// DELETE /admin/reviews/:id
router.delete('/admin/reviews/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid review id' });
  }

  try {
    const result = await query('DELETE FROM product_reviews WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    return res.json({ data: { id: result.rows[0].id } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
});

// ============================================================================
// Press mentions
// ============================================================================

// GET /press-mentions — public, active only, ordered
router.get('/press-mentions', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM press_mentions WHERE active = TRUE ORDER BY sort_order ASC, id ASC'
    );
    return res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch press mentions' });
  }
});

// POST /admin/press-mentions — admin create
router.post('/admin/press-mentions', authMiddleware, requireAdmin, async (req, res) => {
  const { name, logo_url, sort_order, active } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (sort_order !== undefined && !Number.isInteger(sort_order)) {
    return res.status(400).json({ error: 'sort_order must be an integer' });
  }

  try {
    const result = await query(
      `INSERT INTO press_mentions (name, logo_url, sort_order, active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        name.trim(),
        logo_url || null,
        sort_order !== undefined ? sort_order : 0,
        active !== undefined ? !!active : true,
      ]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create press mention' });
  }
});

// PUT /admin/press-mentions/:id — update fields and/or reorder via sort_order
router.put('/admin/press-mentions/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, logo_url, sort_order, active } = req.body || {};

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid press mention id' });
  }
  if (name === undefined && logo_url === undefined && sort_order === undefined && active === undefined) {
    return res.status(400).json({ error: 'At least one field (name, logo_url, sort_order, active) is required' });
  }
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  if (sort_order !== undefined && !Number.isInteger(sort_order)) {
    return res.status(400).json({ error: 'sort_order must be an integer' });
  }

  const fields = [];
  const params = [];

  if (name !== undefined) {
    params.push(name.trim());
    fields.push(`name = $${params.length}`);
  }
  if (logo_url !== undefined) {
    params.push(logo_url);
    fields.push(`logo_url = $${params.length}`);
  }
  if (sort_order !== undefined) {
    params.push(sort_order);
    fields.push(`sort_order = $${params.length}`);
  }
  if (active !== undefined) {
    params.push(!!active);
    fields.push(`active = $${params.length}`);
  }

  params.push(id);

  try {
    const result = await query(
      `UPDATE press_mentions SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Press mention not found' });
    }
    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update press mention' });
  }
});

// DELETE /admin/press-mentions/:id
router.delete('/admin/press-mentions/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid press mention id' });
  }

  try {
    const result = await query('DELETE FROM press_mentions WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Press mention not found' });
    }
    return res.json({ data: { id: result.rows[0].id } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete press mention' });
  }
});

module.exports = router;
