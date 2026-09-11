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
  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'message must be a string' });
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
// photoUrl is optional and, today, nothing public writes it — there is no
// public-facing image upload endpoint in this codebase (the only one,
// POST /media/admin/images, is admin/staff-gated, same as how testimonial
// photos are only ever set from the admin homepage editor). Accepting it
// here just threads the column through end to end so an admin can set it
// later via PUT /admin/reviews/:id.
router.post('/products/:slug/reviews', async (req, res) => {
  const { slug } = req.params;
  const { customerName, rating, comment, photoUrl } = req.body || {};

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
  if (photoUrl !== undefined && photoUrl !== null && typeof photoUrl !== 'string') {
    return res.status(400).json({ error: 'photoUrl must be a string' });
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
      `INSERT INTO product_reviews (product_id, product_name, customer_name, rating, comment, status, photo_url)
       VALUES ($1, $2, $3, $4, $5, 'Chờ duyệt', $6)
       RETURNING *`,
      [product.id, product.name, customerName.trim(), ratingNum, comment.trim(), photoUrl || null]
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

/**
 * Parses the optional `reviewCountOverride` field that the admin review
 * modals send alongside a review (migration 020): the number the admin
 * wants shown beside that product's stars on the public product page,
 * independent of how many review rows actually exist.
 *
 * Three distinct inputs, three distinct meanings:
 *   undefined       -> field not sent at all; leave the product untouched
 *   null / ''       -> admin cleared the box; drop the override so the real
 *                      derived count shows again
 *   integer >= 0    -> set that as the displayed count
 *
 * Returns { ok: true, value } where `value === undefined` means "don't
 * touch", or { ok: false, error } for a bad input.
 */
function parseReviewCountOverride(raw) {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null || raw === '') return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    return { ok: false, error: 'reviewCountOverride must be a non-negative integer, null, or omitted' };
  }
  return { ok: true, value: n };
}

/** Writes a parsed override onto the product. No-op when `value` is undefined. */
async function applyReviewCountOverride(productId, value) {
  if (value === undefined) return;
  await query(
    'UPDATE products SET review_count_override = $1, updated_at = now() WHERE id = $2',
    [value, productId]
  );
}

// POST /admin/reviews — admin manually adds a review (e.g. one collected
// off-site, or seeding a new product's page) rather than only ever
// receiving them through the public submit form. Defaults to 'Đã duyệt'
// (skips the moderation queue) since an admin is entering it directly —
// the queue exists to screen customer-submitted content, not admin's own.
router.post('/admin/reviews', authMiddleware, requireAdmin, async (req, res) => {
  const VALID_STATUSES = ['Chờ duyệt', 'Đã duyệt', 'Từ chối'];
  const { productId, customerName, rating, comment, photoUrl, status, reviewCountOverride, reviewDate } =
    req.body || {};

  const productIdNum = Number(productId);
  if (!Number.isInteger(productIdNum) || productIdNum <= 0) {
    return res.status(400).json({ error: 'productId is required' });
  }
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
  if (photoUrl !== undefined && photoUrl !== null && typeof photoUrl !== 'string') {
    return res.status(400).json({ error: 'photoUrl must be a string' });
  }
  const finalStatus = status ?? 'Đã duyệt';
  if (!VALID_STATUSES.includes(finalStatus)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
  }
  const overrideParsed = parseReviewCountOverride(reviewCountOverride);
  if (!overrideParsed.ok) {
    return res.status(400).json({ error: overrideParsed.error });
  }
  // Optional "Ngày đánh giá" (YYYY-MM-DD) — for a review collected off-site
  // on an earlier day. Omitted means "now", exactly as before this field
  // existed; the admin form only sends it when the date was changed from
  // today, so an ordinary same-day entry keeps its precise timestamp and
  // still sorts above that day's other reviews.
  // Stored at 12:00 UTC, not midnight: the public page renders it with the
  // viewer's own toLocaleDateString(), and midnight UTC shows as the
  // PREVIOUS day anywhere west of Greenwich (this store sells to the US).
  // Noon keeps the same calendar date from UTC-12 through UTC+11.
  let createdAt = null;
  if (reviewDate !== undefined && reviewDate !== null && reviewDate !== '') {
    const m = typeof reviewDate === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(reviewDate);
    const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)) : null;
    // Round-trip check rejects impossible dates like 2026-02-31, which
    // Date.UTC would otherwise silently roll over into March.
    if (!d || d.toISOString().slice(0, 10) !== reviewDate) {
      return res.status(400).json({ error: 'reviewDate must be a valid date (YYYY-MM-DD)' });
    }
    // A day of slack for the admin's timezone being ahead of the server's.
    if (d.getTime() > Date.now() + 36 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'reviewDate cannot be in the future' });
    }
    createdAt = d.toISOString();
  }

  try {
    const productResult = await query('SELECT id, name FROM products WHERE id = $1', [productIdNum]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productResult.rows[0];

    // COALESCE falls back to now() — the column's own default — when no
    // date was given, so an omitted date behaves exactly as before.
    const result = await query(
      `INSERT INTO product_reviews (product_id, product_name, customer_name, rating, comment, status, photo_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, now()))
       RETURNING *`,
      [product.id, product.name, customerName.trim(), ratingNum, comment.trim(), finalStatus, photoUrl || null, createdAt]
    );
    await applyReviewCountOverride(product.id, overrideParsed.value);
    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create review' });
  }
});

// PUT /admin/reviews/:id — update status (approve/reject/etc.), and
// optionally photoUrl — e.g. an admin attaching a customer's product photo
// to a review, the same way testimonial photos are set from the admin
// homepage editor (see content.js). Also optionally edits the review's own
// content (customerName/rating/comment) — explicit request to let an admin
// correct/adjust a review, not just moderate it.
router.put('/admin/reviews/:id', authMiddleware, requireAdmin, async (req, res) => {
  const VALID_STATUSES = ['Chờ duyệt', 'Đã duyệt', 'Từ chối'];
  const { id } = req.params;
  const { status, photoUrl, customerName, rating, comment, reviewCountOverride } = req.body || {};

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid review id' });
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
  }
  if (photoUrl !== undefined && photoUrl !== null && typeof photoUrl !== 'string') {
    return res.status(400).json({ error: 'photoUrl must be a string' });
  }
  if (customerName !== undefined && (typeof customerName !== 'string' || !customerName.trim())) {
    return res.status(400).json({ error: 'customerName must be a non-empty string' });
  }
  let ratingNum;
  if (rating !== undefined) {
    ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }
  }
  if (comment !== undefined && (typeof comment !== 'string' || !comment.trim())) {
    return res.status(400).json({ error: 'comment must be a non-empty string' });
  }
  const overrideParsed = parseReviewCountOverride(reviewCountOverride);
  if (!overrideParsed.ok) {
    return res.status(400).json({ error: overrideParsed.error });
  }

  // Built dynamically (rather than one fixed statement per field
  // combination, as before) now that there are 5 independently-optional
  // fields — a fixed-statement approach would need 2^5 branches to cover
  // every combination a partial edit might send.
  const sets = ['status = $1', 'updated_at = now()'];
  const params = [status];
  if (photoUrl !== undefined) {
    params.push(photoUrl || null);
    sets.push(`photo_url = $${params.length}`);
  }
  if (customerName !== undefined) {
    params.push(customerName.trim());
    sets.push(`customer_name = $${params.length}`);
  }
  if (ratingNum !== undefined) {
    params.push(ratingNum);
    sets.push(`rating = $${params.length}`);
  }
  if (comment !== undefined) {
    params.push(comment.trim());
    sets.push(`comment = $${params.length}`);
  }
  params.push(id);

  try {
    const result = await query(
      `UPDATE product_reviews SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    // The override belongs to the product, not the review — read the owning
    // product off the row we just updated rather than trusting a client-sent id.
    await applyReviewCountOverride(result.rows[0].product_id, overrideParsed.value);
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
