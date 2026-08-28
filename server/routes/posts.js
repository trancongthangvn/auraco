const express = require('express');
const path = require('path');
const fs = require('fs');
const { query, pool } = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { upload, verifyMagicBytes } = require('../lib/upload');
const { sanitizeRichHtml } = require('../lib/sanitize-html');

const router = express.Router();

const STATUSES = ['published', 'draft', 'scheduled'];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * `published` is never taken from the client — it is derived from status so
 * the storefront's `WHERE published = TRUE` filter can't be bypassed by a
 * malformed request, and so a scheduled post flips live on its own date.
 */
function derivePublished(status, scheduledAt) {
  if (status === 'published') return true;
  if (status === 'scheduled') {
    if (!scheduledAt) return false;
    return new Date(scheduledAt).getTime() <= Date.now();
  }
  return false;
}

const POST_LIST_COLUMNS = `
  p.id, p.slug, p.title, p.excerpt, p.image_url, p.published, p.published_at,
  p.status, p.scheduled_at, p.views, p.category_id, p.created_at, p.updated_at,
  c.name AS category_name, c.slug AS category_slug
`;

// ============================================================================
// Post categories
// ============================================================================

// GET /post-categories — public
router.get('/post-categories', async (req, res) => {
  try {
    const result = await query(
      `SELECT pc.*, COUNT(p.id)::int AS post_count
         FROM post_categories pc
         LEFT JOIN posts p ON p.category_id = pc.id AND p.published = TRUE
        GROUP BY pc.id
        ORDER BY pc.sort_order, pc.id`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load post categories' });
  }
});

// POST /admin/post-categories
router.post('/admin/post-categories', authMiddleware, requireAdmin, async (req, res) => {
  const { slug, name, description, sort_order: sortOrder } = req.body || {};
  if (!isNonEmptyString(slug) || !isNonEmptyString(name)) {
    return res.status(400).json({ error: 'slug and name are required' });
  }
  try {
    const result = await query(
      `INSERT INTO post_categories (slug, name, description, sort_order)
       VALUES ($1, $2, $3, COALESCE($4, 0)) RETURNING *`,
      [slug.trim(), name.trim(), description ?? null, Number.isFinite(sortOrder) ? sortOrder : null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A category with this slug already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /admin/post-categories/:id
router.put('/admin/post-categories/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid category id' });

  const { slug, name, description, sort_order: sortOrder } = req.body || {};
  const sets = [];
  const values = [];
  const push = (col, val) => {
    values.push(val);
    sets.push(`${col} = $${values.length}`);
  };

  if (slug !== undefined) {
    if (!isNonEmptyString(slug)) return res.status(400).json({ error: 'slug must be a non-empty string' });
    push('slug', slug.trim());
  }
  if (name !== undefined) {
    if (!isNonEmptyString(name)) return res.status(400).json({ error: 'name must be a non-empty string' });
    push('name', name.trim());
  }
  if (description !== undefined) push('description', description);
  if (sortOrder !== undefined) {
    if (!Number.isFinite(sortOrder)) return res.status(400).json({ error: 'sort_order must be a number' });
    push('sort_order', sortOrder);
  }
  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  sets.push('updated_at = now()');
  values.push(id);

  try {
    const result = await query(
      `UPDATE post_categories SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A category with this slug already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /admin/post-categories/:id — posts keep existing, category_id nulls out
router.delete('/admin/post-categories/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid category id' });
  try {
    const result = await query('DELETE FROM post_categories WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ============================================================================
// Media upload for the rich text editor (images + video)
// ============================================================================
router.post(
  '/admin/posts/upload',
  authMiddleware,
  requireAdmin,
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided (expected field "file")' });
    }
    if (!verifyMagicBytes(req.file.path, req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'File content does not match its declared type' });
    }
    const filename = path.basename(req.file.path);
    res.status(201).json({
      data: {
        url: `/uploads/${filename}`,
        filename,
        mimetype: req.file.mimetype,
        kind: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
      },
    });
  }
);

// ============================================================================
// Public reads
// ============================================================================

// GET /posts — published only. Supports ?category=<slug>&search=&limit=&page=
router.get('/posts', async (req, res) => {
  const { category, search } = req.query;
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 20;
  if (limit > 100) limit = 100;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const offset = (page - 1) * limit;

  const conditions = ['p.published = TRUE'];
  const params = [];

  if (isNonEmptyString(category)) {
    params.push(category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (isNonEmptyString(search)) {
    params.push(`%${search.trim()}%`);
    conditions.push(
      `(p.title ILIKE $${params.length} OR p.excerpt ILIKE $${params.length} OR p.content ILIKE $${params.length})`
    );
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS count FROM posts p
         LEFT JOIN post_categories c ON c.id = p.category_id ${where}`,
      params
    );
    const listResult = await query(
      `SELECT ${POST_LIST_COLUMNS}
         FROM posts p
         LEFT JOIN post_categories c ON c.id = p.category_id
         ${where}
        ORDER BY p.published_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({
      data: { posts: listResult.rows, total: countResult.rows[0].count, page, limit },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

// GET /posts/:slug — published only, increments views
router.get('/posts/:slug', async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
         FROM posts p
         LEFT JOIN post_categories c ON c.id = p.category_id
        WHERE p.slug = $1 AND p.published = TRUE`,
      [req.params.slug]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    // Fire-and-forget: a failed counter bump must never fail the page read.
    query('UPDATE posts SET views = views + 1 WHERE id = $1', [result.rows[0].id]).catch(() => {});

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load post' });
  }
});

// GET /posts/:slug/related — up to 3 published posts in the same category
router.get('/posts/:slug/related', async (req, res) => {
  try {
    const result = await query(
      `SELECT ${POST_LIST_COLUMNS}
         FROM posts p
         LEFT JOIN post_categories c ON c.id = p.category_id
        WHERE p.published = TRUE
          AND p.slug <> $1
          AND p.category_id = (SELECT category_id FROM posts WHERE slug = $1)
        ORDER BY p.published_at DESC
        LIMIT 3`,
      [req.params.slug]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load related posts' });
  }
});

// ============================================================================
// Admin reads/writes
// ============================================================================

// GET /admin/posts — every post regardless of status
router.get('/admin/posts', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT ${POST_LIST_COLUMNS}
         FROM posts p
         LEFT JOIN post_categories c ON c.id = p.category_id
        ORDER BY p.published_at DESC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

// GET /admin/posts/:id — single post incl. full content, any status
router.get('/admin/posts/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid post id' });
  try {
    const result = await query('SELECT * FROM posts WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load post' });
  }
});

function validateWritePayload(body, { partial }) {
  const {
    slug, title, status, scheduled_at: scheduledAt, category_id: categoryId,
  } = body;

  if (!partial || slug !== undefined) {
    if (!isNonEmptyString(slug)) return 'slug is required';
  }
  if (!partial || title !== undefined) {
    if (!isNonEmptyString(title)) return 'title is required';
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    return `status must be one of: ${STATUSES.join(', ')}`;
  }
  if (status === 'scheduled' && !scheduledAt) {
    return 'scheduled_at is required when status is "scheduled"';
  }
  if (scheduledAt !== undefined && scheduledAt !== null && Number.isNaN(new Date(scheduledAt).getTime())) {
    return 'scheduled_at must be a valid date';
  }
  if (categoryId !== undefined && categoryId !== null && !Number.isFinite(categoryId)) {
    return 'category_id must be a number or null';
  }
  return null;
}

// POST /admin/posts
router.post('/admin/posts', authMiddleware, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const invalid = validateWritePayload(body, { partial: false });
  if (invalid) return res.status(400).json({ error: invalid });

  const status = body.status ?? 'published';
  const scheduledAt = status === 'scheduled' ? body.scheduled_at : null;
  const published = derivePublished(status, scheduledAt);

  try {
    const result = await query(
      `INSERT INTO posts
         (slug, title, excerpt, content, image_url, category_id,
          seo_title, seo_description, og_image,
          status, scheduled_at, published, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, COALESCE($13, now()))
       RETURNING *`,
      [
        body.slug.trim(),
        body.title.trim(),
        body.excerpt ?? null,
        sanitizeRichHtml(body.content ?? ''),
        body.image_url ?? null,
        body.category_id ?? null,
        body.seo_title ?? null,
        body.seo_description ?? null,
        body.og_image ?? null,
        status,
        scheduledAt,
        published,
        body.published_at ?? null,
      ]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A post with this slug already exists' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'The selected category no longer exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// PUT /admin/posts/:id — partial update
router.put('/admin/posts/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid post id' });

  const body = req.body || {};
  const invalid = validateWritePayload(body, { partial: true });
  if (invalid) return res.status(400).json({ error: invalid });

  const sets = [];
  const values = [];
  const push = (col, val) => {
    values.push(val);
    sets.push(`${col} = $${values.length}`);
  };

  if (body.slug !== undefined) push('slug', body.slug.trim());
  if (body.title !== undefined) push('title', body.title.trim());
  if (body.excerpt !== undefined) push('excerpt', body.excerpt);
  if (body.content !== undefined) push('content', sanitizeRichHtml(body.content));
  if (body.image_url !== undefined) push('image_url', body.image_url);
  if (body.category_id !== undefined) push('category_id', body.category_id);
  if (body.seo_title !== undefined) push('seo_title', body.seo_title);
  if (body.seo_description !== undefined) push('seo_description', body.seo_description);
  if (body.og_image !== undefined) push('og_image', body.og_image);
  if (body.published_at !== undefined) push('published_at', body.published_at);

  // status/scheduled_at/published always move together.
  if (body.status !== undefined || body.scheduled_at !== undefined) {
    const existing = await query('SELECT status, scheduled_at FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    const status = body.status ?? existing.rows[0].status;
    const scheduledAt =
      status === 'scheduled'
        ? (body.scheduled_at ?? existing.rows[0].scheduled_at)
        : null;

    if (status === 'scheduled' && !scheduledAt) {
      return res.status(400).json({ error: 'scheduled_at is required when status is "scheduled"' });
    }

    push('status', status);
    push('scheduled_at', scheduledAt);
    push('published', derivePublished(status, scheduledAt));
  }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  sets.push('updated_at = now()');
  values.push(id);

  try {
    const result = await query(
      `UPDATE posts SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A post with this slug already exists' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'The selected category no longer exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /admin/posts/:id
router.delete('/admin/posts/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid post id' });
  try {
    const result = await query('DELETE FROM posts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
