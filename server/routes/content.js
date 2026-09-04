const express = require('express');
const { pool, query } = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// This router is mounted at /api/content (see server/index.js). All routes
// below are therefore reachable at /api/content/<path>, including the
// "admin-only" ones — there is no separate /api/admin mount available to
// this file, so admin sub-resources live under /api/content/admin/... .
//
// Endpoints implemented in this file:
//   GET    /api/content/homepage              (public)
//   PUT    /api/content/admin/homepage         (admin)
//   GET    /api/content/site-settings          (public, safe subset)
//   GET    /api/content/admin/site-settings     (admin, full row)
//   PUT    /api/content/admin/site-settings     (admin, full row; also accepts
//                                                 deliveryReturnsItems: string[] —
//                                                 site-wide product page bullets)
//   GET    /api/content/posts                  (public, published only)
//   GET    /api/content/posts/:slug            (public, published only)
//   POST   /api/content/admin/posts             (admin)
//   PUT    /api/content/admin/posts/:id          (admin)
//   DELETE /api/content/admin/posts/:id          (admin)
// ============================================================================

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isBoolean(v) {
  return typeof v === 'boolean';
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((item) => isNonEmptyString(item));
}

const CURRENCY_CODES = ['USD', 'EUR', 'GBP'];

function isCurrencyRates(v) {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  return CURRENCY_CODES.every(
    (code) => v[code] === undefined || (isFiniteNumber(v[code]) && v[code] > 0)
  );
}

// Separate from currency_rates on purpose — keeps the already-working
// numeric rate storage/validation untouched while adding the "Active"
// per-currency toggle from the reference screenshot.
function isCurrencyActive(v) {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  return CURRENCY_CODES.every(
    (code) => v[code] === undefined || isBoolean(v[code])
  );
}

// Public-safe subset of site_settings. Everything else (including the raw
// `extra` blob, in case future ad hoc settings stored there are internal)
// is only exposed via the admin endpoints.
//
// ASSUMPTION: the schema's site_settings table only has columns for
// store_name/contact_email/contact_phone/free_shipping_threshold/
// trust_badges/footer_links/extra. The task also asks for SEO title/
// description, checkout tax percent, and a WhatsApp number, none of which
// have dedicated columns — those are stored as keys inside the `extra`
// JSONB column (seo_title, seo_description, tax_percent, whatsapp_number,
// shipping_fee) and merged/read from there. `shipping_fee` (a flat
// checkout shipping cost) is likewise kept in `extra` since the schema
// only defines `free_shipping_threshold` as a real column.
//
// `delivery_returns_items` (the site-wide "Delivery & Returns" bullet list
// shown on every product page) is stored the same way. It's English-only —
// the product page's own dictionary strings stay as the per-locale fallback
// when this key is absent, so existing i18n content keeps working until an
// admin sets it. `why_love_it_label` (the "Why You'll Love It:" heading
// above the product description) follows the identical single-string
// fallback pattern.
function toPublicSiteSettings(row) {
  const extra = row.extra || {};
  return {
    storeName: row.store_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    freeShippingThreshold: row.free_shipping_threshold,
    trustBadges: row.trust_badges,
    footerLinks: row.footer_links,
    seoTitle: extra.seo_title ?? null,
    seoDescription: extra.seo_description ?? null,
    whatsappNumber: extra.whatsapp_number ?? null,
    shippingFee: extra.shipping_fee ?? null,
    taxPercent: extra.tax_percent ?? null,
    deliveryReturnsItems: extra.delivery_returns_items ?? null,
    whyLoveItLabel: extra.why_love_it_label ?? null,
    ogImageUrl: extra.og_image_url ?? null,
    itGirlEditImageUrl: extra.it_girl_edit_image_url ?? null,
    itGirlEditHeading: extra.it_girl_edit_heading ?? null,
    itGirlEditDescription: extra.it_girl_edit_description ?? null,
    currencyRates: extra.currency_rates ?? null,
    currencyActive: extra.currency_active ?? null,
  };
}

function toAdminSiteSettings(row) {
  return {
    storeName: row.store_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    freeShippingThreshold: row.free_shipping_threshold,
    trustBadges: row.trust_badges,
    footerLinks: row.footer_links,
    extra: row.extra,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// GET /homepage — public
// hero slides + testimonials + a small set of "featured" product refs.
//
// ASSUMPTION: the schema has no explicit "featured" flag/collection on
// products, so featured refs are the top active products by rating/
// review_count (a reasonable stand-in for a homepage "best sellers" rail).
// ============================================================================
router.get('/homepage', async (req, res) => {
  try {
    const [heroResult, testimonialResult, featuredResult] = await Promise.all([
      query(
        `SELECT id, label, title, href, image_url, sort_order
         FROM hero_slides
         WHERE active = TRUE
         ORDER BY sort_order ASC, id ASC`
      ),
      query(
        `SELECT id, initials, name, quote, quote_date, sort_order, photo_url
         FROM testimonials
         WHERE active = TRUE
         ORDER BY sort_order ASC, id ASC`
      ),
      query(
        `SELECT id, slug, name, category, material, price, compare_at_price,
                rating, review_count, images
         FROM products
         WHERE active = TRUE
         ORDER BY rating DESC, review_count DESC, id ASC
         LIMIT 8`
      ),
    ]);

    res.json({
      data: {
        heroSlides: heroResult.rows,
        testimonials: testimonialResult.rows,
        featuredProducts: featuredResult.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load homepage content' });
  }
});

// ============================================================================
// PUT /admin/homepage — admin only
// Whole-collection replace of hero slides and/or testimonials (both are
// small, admin-curated, ordered lists — replace-on-save is simpler and less
// error-prone than diffing individual rows for this use case).
//
// Body: { heroSlides?: [{ label, title, href, image_url, sortOrder?, active? }],
//         testimonials?: [{ initials, name, quote, quoteDate?, sortOrder?, active? }] }
// At least one of heroSlides/testimonials must be provided.
// ============================================================================
router.put('/admin/homepage', authMiddleware, requireAdmin, async (req, res) => {
  const { heroSlides, testimonials } = req.body || {};

  if (heroSlides === undefined && testimonials === undefined) {
    return res.status(400).json({ error: 'Provide heroSlides and/or testimonials' });
  }

  if (heroSlides !== undefined) {
    if (!Array.isArray(heroSlides)) {
      return res.status(400).json({ error: 'heroSlides must be an array' });
    }
    for (const [i, slide] of heroSlides.entries()) {
      if (
        !isNonEmptyString(slide.label) ||
        !isNonEmptyString(slide.title) ||
        !isNonEmptyString(slide.href) ||
        !isNonEmptyString(slide.image_url ?? slide.imageUrl)
      ) {
        return res.status(400).json({
          error: `heroSlides[${i}] requires non-empty label, title, href, image_url`,
        });
      }
    }
  }

  if (testimonials !== undefined) {
    if (!Array.isArray(testimonials)) {
      return res.status(400).json({ error: 'testimonials must be an array' });
    }
    for (const [i, t] of testimonials.entries()) {
      if (!isNonEmptyString(t.initials) || !isNonEmptyString(t.name) || !isNonEmptyString(t.quote)) {
        return res.status(400).json({
          error: `testimonials[${i}] requires non-empty initials, name, quote`,
        });
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (heroSlides !== undefined) {
      await client.query('DELETE FROM hero_slides');
      let i = 0;
      for (const slide of heroSlides) {
        await client.query(
          `INSERT INTO hero_slides (label, title, href, image_url, sort_order, active)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            slide.label,
            slide.title,
            slide.href,
            slide.image_url ?? slide.imageUrl,
            isFiniteNumber(slide.sortOrder ?? slide.sort_order) ? (slide.sortOrder ?? slide.sort_order) : i,
            isBoolean(slide.active) ? slide.active : true,
          ]
        );
        i += 1;
      }
    }

    if (testimonials !== undefined) {
      await client.query('DELETE FROM testimonials');
      let i = 0;
      for (const t of testimonials) {
        await client.query(
          `INSERT INTO testimonials (initials, name, quote, quote_date, sort_order, active, photo_url)
           VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6, $7)`,
          [
            t.initials,
            t.name,
            t.quote,
            t.quoteDate ?? t.quote_date ?? null,
            isFiniteNumber(t.sortOrder ?? t.sort_order) ? (t.sortOrder ?? t.sort_order) : i,
            isBoolean(t.active) ? t.active : true,
            t.photoUrl ?? t.photo_url ?? null,
          ]
        );
        i += 1;
      }
    }

    await client.query('COMMIT');

    const [heroResult, testimonialResult] = await Promise.all([
      query('SELECT id, label, title, href, image_url, sort_order, active FROM hero_slides ORDER BY sort_order ASC, id ASC'),
      query('SELECT id, initials, name, quote, quote_date, sort_order, active, photo_url FROM testimonials ORDER BY sort_order ASC, id ASC'),
    ]);

    res.json({ data: { heroSlides: heroResult.rows, testimonials: testimonialResult.rows } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update homepage content' });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /site-settings — public (safe subset only)
// ============================================================================
router.get('/site-settings', async (req, res) => {
  try {
    const result = await query('SELECT * FROM site_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site settings not configured' });
    }
    res.json({ data: toPublicSiteSettings(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load site settings' });
  }
});

// ============================================================================
// GET /admin/site-settings — admin only, full row
// ============================================================================
router.get('/admin/site-settings', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM site_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site settings not configured' });
    }
    res.json({ data: toAdminSiteSettings(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load site settings' });
  }
});

// ============================================================================
// PUT /admin/site-settings — admin only, partial update
//
// Accepts any of the real columns (storeName, contactEmail, contactPhone,
// freeShippingThreshold, trustBadges, footerLinks) plus the convenience
// extra-JSONB-backed fields (seoTitle, seoDescription, whatsappNumber,
// shippingFee, taxPercent) — those are merged into the `extra` JSONB column
// rather than replacing it wholesale.
// ============================================================================
router.put('/admin/site-settings', authMiddleware, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const sets = [];
  const values = [];
  let idx = 1;

  if (body.storeName !== undefined) {
    if (!isNonEmptyString(body.storeName)) {
      return res.status(400).json({ error: 'storeName must be a non-empty string' });
    }
    sets.push(`store_name = $${idx++}`);
    values.push(body.storeName);
  }
  if (body.contactEmail !== undefined) {
    sets.push(`contact_email = $${idx++}`);
    values.push(body.contactEmail);
  }
  if (body.contactPhone !== undefined) {
    sets.push(`contact_phone = $${idx++}`);
    values.push(body.contactPhone);
  }
  if (body.freeShippingThreshold !== undefined) {
    if (!isFiniteNumber(body.freeShippingThreshold) || body.freeShippingThreshold < 0) {
      return res.status(400).json({ error: 'freeShippingThreshold must be a non-negative number' });
    }
    sets.push(`free_shipping_threshold = $${idx++}`);
    values.push(body.freeShippingThreshold);
  }
  if (body.trustBadges !== undefined) {
    if (!Array.isArray(body.trustBadges)) {
      return res.status(400).json({ error: 'trustBadges must be an array' });
    }
    sets.push(`trust_badges = $${idx++}::jsonb`);
    values.push(JSON.stringify(body.trustBadges));
  }
  if (body.footerLinks !== undefined) {
    if (typeof body.footerLinks !== 'object' || body.footerLinks === null || Array.isArray(body.footerLinks)) {
      return res.status(400).json({ error: 'footerLinks must be an object' });
    }
    sets.push(`footer_links = $${idx++}::jsonb`);
    values.push(JSON.stringify(body.footerLinks));
  }

  const extraPatch = {};
  if (body.seoTitle !== undefined) extraPatch.seo_title = body.seoTitle;
  if (body.seoDescription !== undefined) extraPatch.seo_description = body.seoDescription;
  if (body.whatsappNumber !== undefined) extraPatch.whatsapp_number = body.whatsappNumber;
  if (body.shippingFee !== undefined) {
    if (!isFiniteNumber(body.shippingFee) || body.shippingFee < 0) {
      return res.status(400).json({ error: 'shippingFee must be a non-negative number' });
    }
    extraPatch.shipping_fee = body.shippingFee;
  }
  if (body.taxPercent !== undefined) {
    if (!isFiniteNumber(body.taxPercent) || body.taxPercent < 0) {
      return res.status(400).json({ error: 'taxPercent must be a non-negative number' });
    }
    extraPatch.tax_percent = body.taxPercent;
  }
  if (body.deliveryReturnsItems !== undefined) {
    if (!isStringArray(body.deliveryReturnsItems) || body.deliveryReturnsItems.length === 0) {
      return res.status(400).json({ error: 'deliveryReturnsItems must be a non-empty array of non-empty strings' });
    }
    extraPatch.delivery_returns_items = body.deliveryReturnsItems;
  }
  if (body.whyLoveItLabel !== undefined) {
    if (body.whyLoveItLabel !== null && !isNonEmptyString(body.whyLoveItLabel)) {
      return res.status(400).json({ error: 'whyLoveItLabel must be a non-empty string or null' });
    }
    extraPatch.why_love_it_label = body.whyLoveItLabel;
  }
  if (body.ogImageUrl !== undefined) {
    if (body.ogImageUrl !== null && typeof body.ogImageUrl !== 'string') {
      return res.status(400).json({ error: 'ogImageUrl must be a string or null' });
    }
    extraPatch.og_image_url = body.ogImageUrl;
  }
  if (body.itGirlEditImageUrl !== undefined) {
    if (body.itGirlEditImageUrl !== null && typeof body.itGirlEditImageUrl !== 'string') {
      return res.status(400).json({ error: 'itGirlEditImageUrl must be a string or null' });
    }
    extraPatch.it_girl_edit_image_url = body.itGirlEditImageUrl;
  }
  if (body.itGirlEditHeading !== undefined) {
    if (body.itGirlEditHeading !== null && typeof body.itGirlEditHeading !== 'string') {
      return res.status(400).json({ error: 'itGirlEditHeading must be a string or null' });
    }
    extraPatch.it_girl_edit_heading = body.itGirlEditHeading;
  }
  if (body.itGirlEditDescription !== undefined) {
    if (body.itGirlEditDescription !== null && typeof body.itGirlEditDescription !== 'string') {
      return res.status(400).json({ error: 'itGirlEditDescription must be a string or null' });
    }
    extraPatch.it_girl_edit_description = body.itGirlEditDescription;
  }
  if (body.currencyRates !== undefined) {
    if (!isCurrencyRates(body.currencyRates)) {
      return res.status(400).json({
        error: 'currencyRates must be an object with positive numeric USD/EUR/GBP rates',
      });
    }
    extraPatch.currency_rates = body.currencyRates;
  }
  if (body.currencyActive !== undefined) {
    if (!isCurrencyActive(body.currencyActive)) {
      return res.status(400).json({
        error: 'currencyActive must be an object with boolean USD/EUR/GBP flags',
      });
    }
    extraPatch.currency_active = body.currencyActive;
  }
  if (Object.keys(extraPatch).length > 0) {
    sets.push(`extra = extra || $${idx++}::jsonb`);
    values.push(JSON.stringify(extraPatch));
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  sets.push('updated_at = now()');

  try {
    const result = await query(
      `UPDATE site_settings SET ${sets.join(', ')} WHERE id = 1 RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site settings not configured' });
    }
    res.json({ data: toAdminSiteSettings(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update site settings' });
  }
});

module.exports = router;
