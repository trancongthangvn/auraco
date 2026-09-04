const express = require('express');
const { query } = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

const COLLECTION_COLUMNS =
  'id, slug, name, description, image_url, banner_url, href, sort_order, active, created_at, updated_at';

// ----------------------------------------------------------------------------
// GET /collections — public list of active collections
// ----------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT ${COLLECTION_COLUMNS} FROM collections WHERE active = TRUE ORDER BY sort_order ASC, id ASC`
    );
    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// ----------------------------------------------------------------------------
// GET /collections/admin — admin list of ALL collections (incl. inactive)
// ----------------------------------------------------------------------------
router.get('/admin', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT ${COLLECTION_COLUMNS} FROM collections ORDER BY sort_order ASC, id ASC`
    );
    res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// ----------------------------------------------------------------------------
// POST /collections/admin — create a collection
// ----------------------------------------------------------------------------
router.post('/admin', authMiddleware, requireAdmin, async (req, res) => {
  const { slug, name, description, image_url, banner_url, href, sort_order, active } = req.body || {};

  if (!isNonEmptyString(slug)) {
    return res.status(400).json({ error: 'slug is required' });
  }
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (sort_order !== undefined && !Number.isFinite(Number(sort_order))) {
    return res.status(400).json({ error: 'sort_order must be a number' });
  }
  if (active !== undefined && typeof active !== 'boolean') {
    return res.status(400).json({ error: 'active must be a boolean' });
  }

  try {
    const result = await query(
      `INSERT INTO collections (slug, name, description, image_url, banner_url, href, sort_order, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${COLLECTION_COLUMNS}`,
      [
        slug.trim(),
        name.trim(),
        description ?? null,
        image_url ?? null,
        banner_url ?? null,
        href ?? null,
        sort_order !== undefined ? Number(sort_order) : 0,
        active !== undefined ? active : true,
      ]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A collection with that slug already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// ----------------------------------------------------------------------------
// PUT /collections/admin/:id — update a collection
// ----------------------------------------------------------------------------
router.put('/admin/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: 'Invalid collection id' });
  }

  const { slug, name, description, image_url, banner_url, href, sort_order, active } = req.body || {};

  if (slug !== undefined && !isNonEmptyString(slug)) {
    return res.status(400).json({ error: 'slug must be a non-empty string' });
  }
  if (name !== undefined && !isNonEmptyString(name)) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  if (sort_order !== undefined && !Number.isFinite(Number(sort_order))) {
    return res.status(400).json({ error: 'sort_order must be a number' });
  }
  if (active !== undefined && typeof active !== 'boolean') {
    return res.status(400).json({ error: 'active must be a boolean' });
  }

  // Build a dynamic SET clause only from provided fields, still fully parameterized.
  const fields = [];
  const values = [];
  let idx = 1;

  const setIfProvided = (column, value) => {
    if (value !== undefined) {
      fields.push(`${column} = $${idx++}`);
      values.push(value);
    }
  };

  setIfProvided('slug', slug !== undefined ? slug.trim() : undefined);
  setIfProvided('name', name !== undefined ? name.trim() : undefined);
  setIfProvided('description', description);
  setIfProvided('image_url', image_url);
  setIfProvided('banner_url', banner_url);
  setIfProvided('href', href);
  setIfProvided('sort_order', sort_order !== undefined ? Number(sort_order) : undefined);
  setIfProvided('active', active);

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  fields.push(`updated_at = now()`);
  values.push(id);

  try {
    const result = await query(
      `UPDATE collections SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${COLLECTION_COLUMNS}`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A collection with that slug already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

// ----------------------------------------------------------------------------
// DELETE /collections/admin/:id — delete a collection
// ----------------------------------------------------------------------------
router.delete('/admin/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: 'Invalid collection id' });
  }

  try {
    const result = await query('DELETE FROM collections WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.status(200).json({ data: { id: result.rows[0].id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

module.exports = router;
