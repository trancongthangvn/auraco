// ============================================================================
// AURA & CO — database seed script
//
// Seeds server/schema.sql's tables from the TypeScript mock data that used to
// power the site directly (data/products.ts, data/site.ts, data/admin.ts), so
// a fresh database isn't empty after `psql -f server/schema.sql`.
//
// Idempotency strategy: TRUNCATE ... RESTART IDENTITY CASCADE on every seeded
// table at the top of the transaction, then insert fresh rows. This was
// simpler than juggling ON CONFLICT keys across 16 interdependent tables
// (several of them — products, orders, hero_slides, testimonials — have no
// natural unique key in the mock data at all), and "re-running this resets
// the seed data to the canonical mock snapshot" is the behavior we want for
// a dev/staging seed script. `site_settings` is a singleton enforced by a
// CHECK (id = 1) and already gets its row inserted by schema.sql, so it is
// UPSERTed instead of truncated.
//
// The whole thing runs in a single transaction: BEGIN, insert everything,
// COMMIT; any failure ROLLBACKs so a half-seeded database is never left
// behind.
//
// Usage:  DATABASE_URL=postgres://... node server/seed.js
// ============================================================================

const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Mock data lives in the Next.js app as TypeScript. The repo's root
// node_modules already has the `typescript` package (it's a Next.js app), so
// we use its transpileModule() to turn each data/*.ts file into plain CommonJS
// at require-time rather than guessing at a hand-rolled strip-the-types regex.
const { products } = requireTs('../data/products.ts');
const { collections: siteCollections, heroSlides, testimonials, journalPosts, trustBadges, footerLinks } =
  requireTs('../data/site.ts');
const {
  mockOrders,
  adminAccounts,
  discountCodes,
  inquiries,
  pressMentions,
  productReviews,
  paymentMethodSettings,
  paymentTransactions,
} = requireTs('../data/admin.ts');

// ----------------------------------------------------------------------------
// Load a data/*.ts module by transpiling it with the TypeScript compiler
// (available in the app's root node_modules) and require()-ing the result as
// CommonJS. Far more robust than hand-stripping TS syntax with regexes.
// ----------------------------------------------------------------------------
function requireTs(relPath) {
  const fs = require('fs');
  const ts = require(path.resolve(__dirname, '..', 'node_modules', 'typescript'));
  const filePath = path.resolve(__dirname, relPath);
  const src = fs.readFileSync(filePath, 'utf8');
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
    },
    fileName: filePath,
  });

  const Module = require('module');
  const m = new Module(filePath, module);
  m.filename = filePath;
  m.paths = Module._nodeModulePaths(path.dirname(filePath));
  m._compile(outputText, filePath);
  return m.exports;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------

// "$230.00" -> 230.00
function parseMoney(str) {
  return Number(String(str).replace(/[^0-9.-]/g, ''));
}

// "24/08/2026" -> Date (UTC midnight)
function parseDdMmYyyy(str) {
  const [d, m, y] = String(str).split('/').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// "24/08/2026 11:01" -> Date
function parseDdMmYyyyHm(str) {
  const [datePart, timePart] = String(str).split(' ');
  const [d, m, y] = datePart.split('/').map(Number);
  let hh = 0, mm = 0;
  if (timePart) [hh, mm] = timePart.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

// mock UI payment-method labels -> schema's lowercase enum values
const PAYMENT_METHOD_MAP = {
  Card: 'card',
  PayPal: 'paypal',
  'Cash App': 'cashapp',
  Zelle: 'zelle',
  card: 'card',
  paypal: 'paypal',
  cashapp: 'cashapp',
  zelle: 'zelle',
  applePay: 'applePay',
};

function mapPaymentMethod(raw) {
  const mapped = PAYMENT_METHOD_MAP[raw];
  if (!mapped) throw new Error(`Unknown payment method in mock data: "${raw}"`);
  return mapped;
}

// "QUIET LUXURY" -> "QUIET-LUXURY" (matches the slug convention products.ts
// already uses in its `collections: string[]` field, e.g. "BEACH-VIBE").
function nameToSlug(name) {
  return name.trim().replace(/\s+/g, '-').toUpperCase();
}

function titleCaseFromSlug(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

async function seed() {
  const client = await pool.connect();
  const counts = {};
  try {
    await client.query('BEGIN');

    // ------------------------------------------------------------------
    // Reset seeded tables (site_settings is a singleton, handled via upsert)
    // ------------------------------------------------------------------
    await client.query(`
      TRUNCATE TABLE
        admin_users, collections, products, product_attributes,
        product_collections, discount_codes, orders, order_items, inquiries,
        press_mentions, product_reviews, payment_method_settings,
        payment_transactions, hero_slides, testimonials, posts
      RESTART IDENTITY CASCADE
    `);

    // ------------------------------------------------------------------
    // admin_users
    // ------------------------------------------------------------------
    let n = 0;
    for (const acc of adminAccounts) {
      const hash = await bcrypt.hash(acc.password, 10);
      await client.query(
        `INSERT INTO admin_users (username, password_hash, display_name, role, active)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [acc.username, hash, acc.name, acc.role]
      );
      n++;
    }
    counts.admin_users = n;

    // ------------------------------------------------------------------
    // collections
    // Seeded primarily from data/site.ts's `collections` (name/href/img for
    // the homepage grid), slug derived from the display name (see
    // nameToSlug) since that's the convention data/products.ts's
    // `collections: string[]` field already relies on (e.g. "BEACH-VIBE").
    // Some slugs referenced by products (e.g. "NEW-ARRIVALS") have no entry
    // in site.ts's homepage grid array at all — those get a minimal row
    // (title-cased name, no image) so the product_collections FK still
    // resolves.
    // ------------------------------------------------------------------
    const collectionSlugToId = new Map();
    let sortOrder = 0;
    for (const c of siteCollections) {
      const slug = nameToSlug(c.name);
      const { rows } = await client.query(
        `INSERT INTO collections (slug, name, image_url, href, sort_order, active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id`,
        [slug, c.name, c.img || null, c.href || null, sortOrder++]
      );
      collectionSlugToId.set(slug, rows[0].id);
    }
    // Backfill any slug referenced by a product but missing from site.ts.
    const allReferencedSlugs = new Set();
    for (const p of products) for (const s of p.collections || []) allReferencedSlugs.add(s);
    for (const slug of allReferencedSlugs) {
      if (collectionSlugToId.has(slug)) continue;
      const { rows } = await client.query(
        `INSERT INTO collections (slug, name, sort_order, active)
         VALUES ($1, $2, $3, TRUE)
         RETURNING id`,
        [slug, titleCaseFromSlug(slug), sortOrder++]
      );
      collectionSlugToId.set(slug, rows[0].id);
    }
    counts.collections = collectionSlugToId.size;

    // ------------------------------------------------------------------
    // products (+ product_attributes, + product_collections)
    // ------------------------------------------------------------------
    const productNameToId = new Map();
    const productSlugToId = new Map();
    let productCount = 0;
    let attrCount = 0;
    let productCollectionCount = 0;
    for (const p of products) {
      const { rows } = await client.query(
        `INSERT INTO products
           (slug, name, category, material, price, compare_at_price, rating,
            review_count, images, description, features, stock, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)
         RETURNING id`,
        [
          p.slug,
          p.name,
          p.category,
          p.material,
          p.price,
          p.compareAtPrice ?? null,
          p.rating ?? 0,
          p.reviewCount ?? 0,
          JSON.stringify(p.images || []),
          p.description || '',
          JSON.stringify(p.features || []),
          p.stock ?? 0,
        ]
      );
      const productId = rows[0].id;
      productNameToId.set(p.name, productId);
      productSlugToId.set(p.slug, productId);
      productCount++;

      let attrSort = 0;
      for (const attr of p.attributes || []) {
        await client.query(
          `INSERT INTO product_attributes (product_id, name, value, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [productId, attr.name, attr.value, attrSort++]
        );
        attrCount++;
      }

      for (const slug of p.collections || []) {
        const collectionId = collectionSlugToId.get(slug);
        if (!collectionId) {
          console.warn(`Skipping product_collections row: unknown collection slug "${slug}" for product "${p.name}"`);
          continue;
        }
        await client.query(
          `INSERT INTO product_collections (product_id, collection_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [productId, collectionId]
        );
        productCollectionCount++;
      }
    }
    counts.products = productCount;
    counts.product_attributes = attrCount;
    counts.product_collections = productCollectionCount;

    // ------------------------------------------------------------------
    // discount_codes
    // ------------------------------------------------------------------
    const discountCodeIdByCode = new Map();
    n = 0;
    for (const d of discountCodes) {
      const { rows } = await client.query(
        `INSERT INTO discount_codes
           (code, type, value, min_order, usage_limit, used, start_date, end_date, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [
          d.code,
          d.type,
          d.value,
          d.minOrder,
          d.usageLimit,
          d.used,
          parseDdMmYyyy(d.startDate),
          parseDdMmYyyy(d.endDate),
          d.active,
        ]
      );
      discountCodeIdByCode.set(d.code, rows[0].id);
      n++;
    }
    counts.discount_codes = n;

    // ------------------------------------------------------------------
    // orders + order_items
    // total/status/date/payment_method are display-formatted in the mock
    // data; converted here to NUMERIC/CHECK-enum/TIMESTAMPTZ per schema.
    // subtotal is derived as total - shipping_fee - discount (mock orders
    // carry no explicit discount, so discount_amount is 0 throughout).
    // ------------------------------------------------------------------
    let orderCount = 0;
    let orderItemCount = 0;
    for (const o of mockOrders) {
      const total = parseMoney(o.total);
      const shippingFee = o.shippingFee ?? 0;
      const subtotal = total - shippingFee;
      const { rows } = await client.query(
        `INSERT INTO orders
           (order_code, customer_name, email, phone, address, city, country,
            subtotal, shipping_fee, discount_amount, total, status, payment_method,
            created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,$12,$13,$13)
         RETURNING id`,
        [
          o.id,
          o.customer,
          o.email,
          o.phone,
          o.address,
          o.city,
          o.country,
          subtotal,
          shippingFee,
          total,
          o.status,
          mapPaymentMethod(o.paymentMethod),
          parseDdMmYyyy(o.date),
        ]
      );
      const orderId = rows[0].id;
      orderCount++;

      for (const item of o.items || []) {
        const productId = productNameToId.get(item.name) ?? null;
        if (productId == null) {
          console.warn(`order_items: no matching product for "${item.name}" (order ${o.id}); inserting with product_id = NULL`);
        }
        await client.query(
          `INSERT INTO order_items (order_id, product_id, name, material, price, qty, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [orderId, productId, item.name, item.material, item.price, item.qty, item.img || null]
        );
        orderItemCount++;
      }
    }
    counts.orders = orderCount;
    counts.order_items = orderItemCount;

    // ------------------------------------------------------------------
    // inquiries
    // ------------------------------------------------------------------
    n = 0;
    for (const i of inquiries) {
      const ts = parseDdMmYyyy(i.date);
      await client.query(
        `INSERT INTO inquiries (name, email, phone, subject, message, resolved, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
        [i.name, i.email, i.phone, i.subject, i.message, i.resolved, ts]
      );
      n++;
    }
    counts.inquiries = n;

    // ------------------------------------------------------------------
    // press_mentions
    // ------------------------------------------------------------------
    n = 0;
    for (const p of pressMentions) {
      await client.query(
        `INSERT INTO press_mentions (name, logo_url, sort_order, active) VALUES ($1, NULL, $2, TRUE)`,
        [p.name, p.sort]
      );
      n++;
    }
    counts.press_mentions = n;

    // ------------------------------------------------------------------
    // product_reviews
    // productName -> products.id resolved by exact (case-sensitive) name
    // match against data/products.ts; unmatched rows are skipped with a
    // warning rather than failing the whole seed, per task spec.
    // ------------------------------------------------------------------
    n = 0;
    for (const r of productReviews) {
      const productId = productNameToId.get(r.productName);
      if (!productId) {
        console.warn(`product_reviews: no product found named "${r.productName}", skipping review id ${r.id}`);
        continue;
      }
      const ts = parseDdMmYyyy(r.date);
      await client.query(
        `INSERT INTO product_reviews
           (product_id, product_name, customer_name, rating, comment, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
        [productId, r.productName, r.customer, r.rating, r.comment, r.status, ts]
      );
      n++;
    }
    counts.product_reviews = n;

    // ------------------------------------------------------------------
    // payment_method_settings (key is a natural PK, upsert per row)
    // ------------------------------------------------------------------
    n = 0;
    for (const pm of paymentMethodSettings) {
      await client.query(
        `INSERT INTO payment_method_settings (key, label, enabled, detail, qr_image_url)
         VALUES ($1,$2,$3,$4,NULL)`,
        [pm.key, pm.label, pm.enabled, pm.detail]
      );
      n++;
    }
    counts.payment_method_settings = n;

    // ------------------------------------------------------------------
    // payment_transactions (order_id resolved via orders.order_code)
    // ------------------------------------------------------------------
    const { rows: orderRows } = await client.query('SELECT id, order_code FROM orders');
    const orderCodeToId = new Map(orderRows.map((r) => [r.order_code, r.id]));
    n = 0;
    for (const t of paymentTransactions) {
      const orderId = orderCodeToId.get(t.orderId);
      if (!orderId) {
        console.warn(`payment_transactions: no order found for code "${t.orderId}", skipping transaction ${t.id}`);
        continue;
      }
      await client.query(
        `INSERT INTO payment_transactions (order_id, method, amount, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$5)`,
        [orderId, mapPaymentMethod(t.method), parseMoney(t.amount), t.status, parseDdMmYyyyHm(t.date)]
      );
      n++;
    }
    counts.payment_transactions = n;

    // ------------------------------------------------------------------
    // hero_slides
    // ------------------------------------------------------------------
    n = 0;
    for (const [idx, h] of heroSlides.entries()) {
      await client.query(
        `INSERT INTO hero_slides (label, title, href, image_url, sort_order, active)
         VALUES ($1,$2,$3,$4,$5,TRUE)`,
        [h.label, h.title, h.href, h.img, idx]
      );
      n++;
    }
    counts.hero_slides = n;

    // ------------------------------------------------------------------
    // testimonials
    // ------------------------------------------------------------------
    n = 0;
    for (const [idx, t] of testimonials.entries()) {
      await client.query(
        `INSERT INTO testimonials (initials, name, quote, quote_date, sort_order, active)
         VALUES ($1,$2,$3,$4,$5,TRUE)`,
        [t.initials, t.name, t.quote, parseDdMmYyyy(t.date), idx]
      );
      n++;
    }
    counts.testimonials = n;

    // ------------------------------------------------------------------
    // site_settings (singleton row already created by schema.sql; upsert it)
    // trust_badges / footer_links come straight from data/site.ts; there is
    // no general store contact email/phone in the mock data, so those stay
    // NULL. free_shipping_threshold is set to 120 to match the
    // "FREE DELIVERY $120+" trust badge text.
    // ------------------------------------------------------------------
    await client.query(
      `UPDATE site_settings
         SET free_shipping_threshold = $1,
             trust_badges = $2,
             footer_links = $3,
             updated_at = now()
       WHERE id = 1`,
      [120, JSON.stringify(trustBadges || []), JSON.stringify(footerLinks || {})]
    );
    counts.site_settings = 1;

    // ------------------------------------------------------------------
    // posts (journal)
    // body is kept as a JSONB array of paragraph strings — journalPosts.body
    // in data/site.ts is already an ordered string[], which matches the
    // schema's `body JSONB ... array of paragraph strings` design exactly,
    // so no join-into-one-string transform is needed.
    // ------------------------------------------------------------------
    n = 0;
    for (const post of journalPosts) {
      const publishedAt = new Date(post.date); // e.g. "Dec 11, 2025"
      await client.query(
        `INSERT INTO posts (slug, title, excerpt, body, image_url, published, published_at)
         VALUES ($1,$2,$3,$4,$5,TRUE,$6)`,
        [post.slug, post.title, post.excerpt, JSON.stringify(post.body || []), post.img || null, publishedAt]
      );
      n++;
    }
    counts.posts = n;

    await client.query('COMMIT');

    for (const [table, count] of Object.entries(counts)) {
      console.log(`Seeded ${table}: ${count} row(s)`);
    }
    console.log('Seed complete');
    return counts;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Seed failed:', err);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { seed };
