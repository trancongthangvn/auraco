const express = require('express');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { authMiddleware, requireStaffOrAdmin } = require('../middleware/auth');
const { upload, verifyMagicBytes } = require('../lib/upload');

const router = express.Router();

const VALID_CATEGORIES = ['Necklaces', 'Bracelets', 'Earrings', 'Signature Sets'];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Loads the full attribute list + collection slug list for a set of product
 * ids and merges them onto the given product rows (mutates in place, adds
 * `attributes` and `collections` arrays). Also overwrites `rating` /
 * `review_count` with numbers computed live from approved rows in
 * `product_reviews`, so the stored `products.rating`/`review_count` columns
 * (legacy seed data) can never drift out of sync with what Reviews.tsx and
 * the product page actually display — the reviews table is the single
 * source of truth for every surface (product page badge, Reviews summary,
 * catalog/carousel star ratings). Returns the same array.
 */
async function attachRelations(products) {
  if (products.length === 0) return products;
  const ids = products.map((p) => p.id);

  const [attrsResult, collsResult, reviewStatsResult] = await Promise.all([
    query(
      `SELECT id, product_id, name, value, sort_order
         FROM product_attributes
        WHERE product_id = ANY($1::int[])
        ORDER BY product_id, sort_order, id`,
      [ids]
    ),
    query(
      `SELECT pc.product_id, c.slug
         FROM product_collections pc
         JOIN collections c ON c.id = pc.collection_id
        WHERE pc.product_id = ANY($1::int[])`,
      [ids]
    ),
    query(
      `SELECT product_id, AVG(rating)::numeric AS avg_rating, COUNT(*)::int AS review_count
         FROM product_reviews
        WHERE product_id = ANY($1::int[]) AND status = 'Đã duyệt'
        GROUP BY product_id`,
      [ids]
    ),
  ]);

  const attrsByProduct = new Map();
  for (const row of attrsResult.rows) {
    if (!attrsByProduct.has(row.product_id)) attrsByProduct.set(row.product_id, []);
    attrsByProduct.get(row.product_id).push({ name: row.name, value: row.value });
  }

  const collsByProduct = new Map();
  for (const row of collsResult.rows) {
    if (!collsByProduct.has(row.product_id)) collsByProduct.set(row.product_id, []);
    collsByProduct.get(row.product_id).push(row.slug);
  }

  const reviewStatsByProduct = new Map();
  for (const row of reviewStatsResult.rows) {
    reviewStatsByProduct.set(row.product_id, {
      rating: Number(row.avg_rating),
      reviewCount: row.review_count,
    });
  }

  for (const p of products) {
    p.attributes = attrsByProduct.get(p.id) || [];
    p.collections = collsByProduct.get(p.id) || [];
    // Approved reviews win where they exist. Where none have been written
    // yet, the stored columns stand: those hold the real ratings imported
    // from the client's live catalogue, and blanking them would strip the
    // stars from 43 of 45 products in exchange for no extra accuracy.
    const stats = reviewStatsByProduct.get(p.id);
    if (stats && stats.reviewCount > 0) {
      p.rating = stats.rating;
      p.review_count = stats.reviewCount;
    }
  }

  return products;
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** `video_url` is optional: a string path/URL, or null to clear it. */
function isStringOrNull(v) {
  return v === null || typeof v === 'string';
}

/** Empty/blank video URLs are stored as NULL so "has a video" stays IS NOT NULL. */
function normalizeVideoUrl(v) {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
}

// ----------------------------------------------------------------------------
// Public: GET /api/products  (list, filter by collection/category)
// ----------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { category, collection } = req.query;

    const conditions = ['p.active = TRUE'];
    const params = [];

    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    let joinClause = '';
    if (collection) {
      params.push(collection);
      joinClause = `
        JOIN product_collections pc ON pc.product_id = p.id
        JOIN collections col ON col.id = pc.collection_id AND lower(col.slug) = lower($${params.length})
      `;
    }

    const sql = `
      SELECT p.*
        FROM products p
        ${joinClause}
       WHERE ${conditions.join(' AND ')}
       ORDER BY (p.sort_order = 0), p.sort_order ASC, p.created_at DESC
    `;

    const result = await query(sql, params);
    const products = await attachRelations(result.rows);

    res.json({ data: products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// ----------------------------------------------------------------------------
// Public: GET /api/products/:slug  (with product_attributes joined)
// ----------------------------------------------------------------------------
router.get('/:slug', async (req, res) => {
  try {
    const result = await query('SELECT * FROM products WHERE lower(slug) = lower($1)', [req.params.slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const [product] = await attachRelations(result.rows);
    res.json({ data: product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ----------------------------------------------------------------------------
// Public: GET /api/products/:slug/bundle — admin-picked "frequently bought
// together" companions plus the bundle discount, for the product page.
// ----------------------------------------------------------------------------
router.get('/:slug/bundle', async (req, res) => {
  try {
    const productResult = await query(
      'SELECT id, bundle_discount_percent FROM products WHERE lower(slug) = lower($1)',
      [req.params.slug]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productResult.rows[0];

    const companionsResult = await query(
      `SELECT c.slug, c.name, c.price, c.compare_at_price, c.images
         FROM product_bundles pb
         JOIN products c ON c.id = pb.companion_id
        WHERE pb.product_id = $1 AND c.active = TRUE
        ORDER BY pb.sort_order, pb.id`,
      [product.id]
    );

    res.json({
      data: {
        discountPercent: Number(product.bundle_discount_percent),
        companions: companionsResult.rows.map((c) => ({
          slug: c.slug,
          name: c.name,
          price: Number(c.price),
          compareAtPrice: c.compare_at_price != null ? Number(c.compare_at_price) : null,
          image: Array.isArray(c.images) ? c.images[0] : undefined,
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bundle' });
  }
});

// ----------------------------------------------------------------------------
// Admin: GET /api/products/admin/products (list ALL, including inactive)
// ----------------------------------------------------------------------------
router.get('/admin/products', authMiddleware, requireStaffOrAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM products ORDER BY (sort_order = 0), sort_order ASC, created_at DESC'
    );
    const products = await attachRelations(result.rows);
    res.json({ data: products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// ----------------------------------------------------------------------------
// Admin: POST /api/products/admin/products
// ----------------------------------------------------------------------------
router.post('/admin/products', authMiddleware, requireStaffOrAdmin, async (req, res) => {
  try {
    const {
      slug,
      name,
      category,
      material,
      price,
      compareAtPrice,
      rating,
      reviewCount,
      images,
      description,
      features,
      stock,
      active,
      videoUrl,
      video_url: videoUrlSnake,
      collections, // array of collection slugs
    } = req.body || {};

    const videoUrlInput = videoUrl !== undefined ? videoUrl : videoUrlSnake;

    if (!isNonEmptyString(slug)) return res.status(400).json({ error: 'slug is required' });
    if (!isNonEmptyString(name)) return res.status(400).json({ error: 'name is required' });
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    if (!isNonEmptyString(material)) return res.status(400).json({ error: 'material is required' });
    if (!isFiniteNumber(price) || price < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }
    if (compareAtPrice !== undefined && compareAtPrice !== null && (!isFiniteNumber(compareAtPrice) || compareAtPrice < 0)) {
      return res.status(400).json({ error: 'compareAtPrice must be a non-negative number' });
    }
    if (images !== undefined && !Array.isArray(images)) {
      return res.status(400).json({ error: 'images must be an array' });
    }
    if (features !== undefined && !Array.isArray(features)) {
      return res.status(400).json({ error: 'features must be an array' });
    }
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
      return res.status(400).json({ error: 'stock must be a non-negative integer' });
    }
    if (videoUrlInput !== undefined && !isStringOrNull(videoUrlInput)) {
      return res.status(400).json({ error: 'videoUrl must be a string or null' });
    }

    const result = await query(
      `INSERT INTO products
         (slug, name, category, material, price, compare_at_price, rating,
          review_count, images, description, features, stock, active, video_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        slug.trim(),
        name.trim(),
        category,
        material.trim(),
        price,
        compareAtPrice ?? null,
        isFiniteNumber(rating) ? rating : 0,
        Number.isInteger(reviewCount) ? reviewCount : 0,
        JSON.stringify(images || []),
        typeof description === 'string' ? description : '',
        JSON.stringify(features || []),
        Number.isInteger(stock) ? stock : 0,
        active === undefined ? true : Boolean(active),
        normalizeVideoUrl(videoUrlInput),
      ]
    );

    const product = result.rows[0];

    if (Array.isArray(collections) && collections.length > 0) {
      const collResult = await query('SELECT id, slug FROM collections WHERE slug = ANY($1::text[])', [collections]);
      for (const row of collResult.rows) {
        await query(
          'INSERT INTO product_collections (product_id, collection_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [product.id, row.id]
        );
      }
    }

    const [full] = await attachRelations([product]);
    res.status(201).json({ data: full });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A product with this slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// ----------------------------------------------------------------------------
// Admin: PUT /api/products/admin/products/:slug
// ----------------------------------------------------------------------------
router.put('/admin/products/:slug', authMiddleware, requireStaffOrAdmin, async (req, res) => {
  try {
    const existing = await query('SELECT * FROM products WHERE slug = $1', [req.params.slug]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const current = existing.rows[0];

    const {
      name,
      category,
      material,
      price,
      compareAtPrice,
      rating,
      reviewCount,
      images,
      description,
      features,
      stock,
      active,
      videoUrl,
      video_url: videoUrlSnake,
      collections,
      sortOrder,
      bundleDiscountPercent,
    } = req.body || {};

    const videoUrlInput = videoUrl !== undefined ? videoUrl : videoUrlSnake;

    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    if (price !== undefined && (!isFiniteNumber(price) || price < 0)) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }
    if (compareAtPrice !== undefined && compareAtPrice !== null && (!isFiniteNumber(compareAtPrice) || compareAtPrice < 0)) {
      return res.status(400).json({ error: 'compareAtPrice must be a non-negative number' });
    }
    if (images !== undefined && !Array.isArray(images)) {
      return res.status(400).json({ error: 'images must be an array' });
    }
    if (features !== undefined && !Array.isArray(features)) {
      return res.status(400).json({ error: 'features must be an array' });
    }
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
      return res.status(400).json({ error: 'stock must be a non-negative integer' });
    }
    if (videoUrlInput !== undefined && !isStringOrNull(videoUrlInput)) {
      return res.status(400).json({ error: 'videoUrl must be a string or null' });
    }
    if (sortOrder !== undefined && !Number.isInteger(sortOrder)) {
      return res.status(400).json({ error: 'sortOrder must be an integer' });
    }
    if (
      bundleDiscountPercent !== undefined &&
      (!isFiniteNumber(bundleDiscountPercent) || bundleDiscountPercent < 0 || bundleDiscountPercent > 100)
    ) {
      return res.status(400).json({ error: 'bundleDiscountPercent must be a number between 0 and 100' });
    }

    const result = await query(
      `UPDATE products SET
         name = $1,
         category = $2,
         material = $3,
         price = $4,
         compare_at_price = $5,
         rating = $6,
         review_count = $7,
         images = $8,
         description = $9,
         features = $10,
         stock = $11,
         active = $12,
         video_url = $13,
         sort_order = $14,
         bundle_discount_percent = $15,
         updated_at = now()
       WHERE slug = $16
       RETURNING *`,
      [
        name !== undefined ? name : current.name,
        category !== undefined ? category : current.category,
        material !== undefined ? material : current.material,
        price !== undefined ? price : current.price,
        compareAtPrice !== undefined ? compareAtPrice : current.compare_at_price,
        rating !== undefined ? rating : current.rating,
        reviewCount !== undefined ? reviewCount : current.review_count,
        images !== undefined ? JSON.stringify(images) : JSON.stringify(current.images),
        description !== undefined ? description : current.description,
        features !== undefined ? JSON.stringify(features) : JSON.stringify(current.features),
        stock !== undefined ? stock : current.stock,
        active !== undefined ? Boolean(active) : current.active,
        videoUrlInput !== undefined ? normalizeVideoUrl(videoUrlInput) : current.video_url,
        sortOrder !== undefined ? sortOrder : current.sort_order,
        bundleDiscountPercent !== undefined ? bundleDiscountPercent : current.bundle_discount_percent,
        req.params.slug,
      ]
    );

    const product = result.rows[0];

    if (Array.isArray(collections)) {
      await query('DELETE FROM product_collections WHERE product_id = $1', [product.id]);
      if (collections.length > 0) {
        const collResult = await query('SELECT id FROM collections WHERE slug = ANY($1::text[])', [collections]);
        for (const row of collResult.rows) {
          await query(
            'INSERT INTO product_collections (product_id, collection_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [product.id, row.id]
          );
        }
      }
    }

    const [full] = await attachRelations([product]);
    res.json({ data: full });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ----------------------------------------------------------------------------
// Admin: DELETE /api/products/admin/products/:slug
// ----------------------------------------------------------------------------
router.delete('/admin/products/:slug', authMiddleware, requireStaffOrAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM products WHERE slug = $1 RETURNING id', [req.params.slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ data: { id: result.rows[0].id, slug: req.params.slug } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ----------------------------------------------------------------------------
// Admin: manage product_attributes name/value pairs
// GET   /api/products/admin/products/:slug/attributes
// POST  /api/products/admin/products/:slug/attributes         { name, value, sortOrder? }
// PUT   /api/products/admin/products/:slug/attributes/:id     { name?, value?, sortOrder? }
// DELETE /api/products/admin/products/:slug/attributes/:id
// ----------------------------------------------------------------------------
router.get('/admin/products/:slug/attributes', authMiddleware, requireStaffOrAdmin, async (req, res) => {
  try {
    const productResult = await query('SELECT id FROM products WHERE slug = $1', [req.params.slug]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const result = await query(
      'SELECT * FROM product_attributes WHERE product_id = $1 ORDER BY sort_order, id',
      [productResult.rows[0].id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list attributes' });
  }
});

router.post('/admin/products/:slug/attributes', authMiddleware, requireStaffOrAdmin, async (req, res) => {
  try {
    const { name, value, sortOrder } = req.body || {};
    if (!isNonEmptyString(name)) return res.status(400).json({ error: 'name is required' });
    if (!isNonEmptyString(value)) return res.status(400).json({ error: 'value is required' });

    const productResult = await query('SELECT id FROM products WHERE slug = $1', [req.params.slug]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await query(
      `INSERT INTO product_attributes (product_id, name, value, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [productResult.rows[0].id, name.trim(), value.trim(), Number.isInteger(sortOrder) ? sortOrder : 0]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add attribute' });
  }
});

router.put('/admin/products/:slug/attributes/:id', authMiddleware, requireStaffOrAdmin, async (req, res) => {
  try {
    const { name, value, sortOrder } = req.body || {};

    const productResult = await query('SELECT id FROM products WHERE slug = $1', [req.params.slug]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existing = await query(
      'SELECT * FROM product_attributes WHERE id = $1 AND product_id = $2',
      [req.params.id, productResult.rows[0].id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Attribute not found' });
    }
    const current = existing.rows[0];

    if (name !== undefined && !isNonEmptyString(name)) {
      return res.status(400).json({ error: 'name must be a non-empty string' });
    }
    if (value !== undefined && !isNonEmptyString(value)) {
      return res.status(400).json({ error: 'value must be a non-empty string' });
    }

    const result = await query(
      `UPDATE product_attributes SET name = $1, value = $2, sort_order = $3 WHERE id = $4 RETURNING *`,
      [
        name !== undefined ? name.trim() : current.name,
        value !== undefined ? value.trim() : current.value,
        Number.isInteger(sortOrder) ? sortOrder : current.sort_order,
        req.params.id,
      ]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update attribute' });
  }
});

router.delete('/admin/products/:slug/attributes/:id', authMiddleware, requireStaffOrAdmin, async (req, res) => {
  try {
    const productResult = await query('SELECT id FROM products WHERE slug = $1', [req.params.slug]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await query(
      'DELETE FROM product_attributes WHERE id = $1 AND product_id = $2 RETURNING id',
      [req.params.id, productResult.rows[0].id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attribute not found' });
    }
    res.json({ data: { id: result.rows[0].id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete attribute' });
  }
});

// ----------------------------------------------------------------------------
// Admin: "frequently bought together" companions
// GET /api/products/admin/products/:slug/bundle
// PUT /api/products/admin/products/:slug/bundle  { companions: string[] (slugs), discountPercent? }
// ----------------------------------------------------------------------------
router.get('/admin/products/:slug/bundle', authMiddleware, requireStaffOrAdmin, async (req, res) => {
  try {
    const productResult = await query(
      'SELECT id, bundle_discount_percent FROM products WHERE slug = $1',
      [req.params.slug]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productResult.rows[0];

    const companionsResult = await query(
      `SELECT c.slug, c.name, c.price, c.images
         FROM product_bundles pb
         JOIN products c ON c.id = pb.companion_id
        WHERE pb.product_id = $1
        ORDER BY pb.sort_order, pb.id`,
      [product.id]
    );

    res.json({
      data: {
        discountPercent: Number(product.bundle_discount_percent),
        companions: companionsResult.rows.map((c) => ({
          slug: c.slug,
          name: c.name,
          price: Number(c.price),
          image: Array.isArray(c.images) ? c.images[0] : undefined,
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bundle' });
  }
});

router.put('/admin/products/:slug/bundle', authMiddleware, requireStaffOrAdmin, async (req, res) => {
  try {
    const { companions, discountPercent } = req.body || {};

    if (companions !== undefined && !Array.isArray(companions)) {
      return res.status(400).json({ error: 'companions must be an array of slugs' });
    }
    if (
      discountPercent !== undefined &&
      (!isFiniteNumber(discountPercent) || discountPercent < 0 || discountPercent > 100)
    ) {
      return res.status(400).json({ error: 'discountPercent must be a number between 0 and 100' });
    }

    const productResult = await query('SELECT id FROM products WHERE slug = $1', [req.params.slug]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const productId = productResult.rows[0].id;

    if (discountPercent !== undefined) {
      await query('UPDATE products SET bundle_discount_percent = $1, updated_at = now() WHERE id = $2', [
        discountPercent,
        productId,
      ]);
    }

    if (Array.isArray(companions)) {
      await query('DELETE FROM product_bundles WHERE product_id = $1', [productId]);
      if (companions.length > 0) {
        const companionResult = await query(
          'SELECT id, slug FROM products WHERE slug = ANY($1::text[]) AND id <> $2',
          [companions, productId]
        );
        const orderBySlug = new Map(companions.map((slug, i) => [slug, i]));
        for (const row of companionResult.rows) {
          await query(
            'INSERT INTO product_bundles (product_id, companion_id, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [productId, row.id, orderBySlug.get(row.slug) ?? 0]
          );
        }
      }
    }

    const finalResult = await query('SELECT bundle_discount_percent FROM products WHERE id = $1', [productId]);
    const companionsResult = await query(
      `SELECT c.slug, c.name, c.price, c.images
         FROM product_bundles pb
         JOIN products c ON c.id = pb.companion_id
        WHERE pb.product_id = $1
        ORDER BY pb.sort_order, pb.id`,
      [productId]
    );

    res.json({
      data: {
        discountPercent: Number(finalResult.rows[0].bundle_discount_percent),
        companions: companionsResult.rows.map((c) => ({
          slug: c.slug,
          name: c.name,
          price: Number(c.price),
          image: Array.isArray(c.images) ? c.images[0] : undefined,
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update bundle' });
  }
});

// ----------------------------------------------------------------------------
// Admin: image upload for products
// POST /api/products/admin/products/upload  (multipart/form-data, field "image")
// ----------------------------------------------------------------------------
router.post(
  '/admin/products/upload',
  authMiddleware,
  requireStaffOrAdmin,
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided (expected field "image")' });
    }

    const ok = verifyMagicBytes(req.file.path, req.file.mimetype);
    if (!ok) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'File content does not match declared type' });
    }

    const publicUrl = `/uploads/${path.basename(req.file.path)}`;
    res.status(201).json({ data: { url: publicUrl, filename: path.basename(req.file.path) } });
  }
);

// ----------------------------------------------------------------------------
// Admin: video upload for products
// POST /api/products/admin/products/upload-video  (multipart/form-data, field "video")
//
// Same shape as the image upload above; the MIME whitelist in lib/upload.js
// caps video/mp4 at 50MB and the magic-byte check rejects a file whose bytes
// do not match the declared type.
// ----------------------------------------------------------------------------
router.post(
  '/admin/products/upload-video',
  authMiddleware,
  requireStaffOrAdmin,
  upload.single('video'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided (expected field "video")' });
    }

    if (!req.file.mimetype.startsWith('video/')) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Only video files are allowed here' });
    }

    const ok = verifyMagicBytes(req.file.path, req.file.mimetype);
    if (!ok) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'File content does not match declared type' });
    }

    const publicUrl = `/uploads/${path.basename(req.file.path)}`;
    res.status(201).json({ data: { url: publicUrl, filename: path.basename(req.file.path) } });
  }
);

module.exports = router;
