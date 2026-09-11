require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { UPLOAD_DIR } = require('./lib/upload');

const app = express();

// ----------------------------------------------------------------------------
// CORS — allowed origins configurable via CORS_ORIGINS (comma-separated)
// ----------------------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no origin header) and any whitelisted origin.
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());

// ----------------------------------------------------------------------------
// Simple in-memory per-IP rate limiter for POST /api/admin/login
// (10 attempts / 15 min per IP)
// ----------------------------------------------------------------------------
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10;
const loginAttempts = new Map(); // ip -> { count, windowStart }

function loginRateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.windowStart > LOGIN_RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  }

  entry.count += 1;
  next();
}

// Periodically clear stale entries so the Map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts.entries()) {
    if (now - entry.windowStart > LOGIN_RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}, LOGIN_RATE_LIMIT_WINDOW_MS).unref();

app.post('/api/admin/login', loginRateLimiter);

// ----------------------------------------------------------------------------
// Same per-IP limiter shape as login's, kept as its own Map rather than a
// shared factory so nothing about the login limiter's existing behavior is
// touched. Applies to POST /api/orders/lookup (contract line item 16, public
// order lookup by code + email) — that route matches two customer-supplied
// values against a DB row with no other auth, so it gets the same guard
// against being hammered as the credential-checking login route does.
// ----------------------------------------------------------------------------
const ORDER_LOOKUP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const ORDER_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS = 10;
const orderLookupAttempts = new Map(); // ip -> { count, windowStart }

function orderLookupRateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const entry = orderLookupAttempts.get(ip);

  if (!entry || now - entry.windowStart > ORDER_LOOKUP_RATE_LIMIT_WINDOW_MS) {
    orderLookupAttempts.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= ORDER_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many lookup attempts. Please try again later.' });
  }

  entry.count += 1;
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of orderLookupAttempts.entries()) {
    if (now - entry.windowStart > ORDER_LOOKUP_RATE_LIMIT_WINDOW_MS) {
      orderLookupAttempts.delete(ip);
    }
  }
}, ORDER_LOOKUP_RATE_LIMIT_WINDOW_MS).unref();

app.post('/api/orders/lookup', orderLookupRateLimiter);

// ----------------------------------------------------------------------------
// Same shape again for POST /api/products/:slug/reviews (contract line item
// 21, "khách hàng gửi đánh giá kèm hình ảnh"). That route always accepted an
// unauthenticated write; the review text alone was already cheap to spam
// with no rate limit at all, unchanged here. What's new is a file write to
// disk, which is a materially different cost — this limiter is scoped to
// that new capability, not a general redesign of the review flow.
// ----------------------------------------------------------------------------
const REVIEW_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const REVIEW_RATE_LIMIT_MAX_ATTEMPTS = 10;
const reviewAttempts = new Map(); // ip -> { count, windowStart }

function reviewRateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const entry = reviewAttempts.get(ip);

  if (!entry || now - entry.windowStart > REVIEW_RATE_LIMIT_WINDOW_MS) {
    reviewAttempts.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= REVIEW_RATE_LIMIT_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many reviews submitted. Please try again later.' });
  }

  entry.count += 1;
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of reviewAttempts.entries()) {
    if (now - entry.windowStart > REVIEW_RATE_LIMIT_WINDOW_MS) {
      reviewAttempts.delete(ip);
    }
  }
}, REVIEW_RATE_LIMIT_WINDOW_MS).unref();

app.post('/api/products/:slug/reviews', reviewRateLimiter);

// ----------------------------------------------------------------------------
// Serve uploaded media. The upload routes hand back "/uploads/<file>" URLs and
// next.config.ts rewrites /uploads/* here, so without this every uploaded
// image 404s. Files are served read-only with a long cache (names are
// content-unique: timestamp + random).
// ----------------------------------------------------------------------------
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    index: false,
    dotfiles: 'deny',
    maxAge: '30d',
    setHeaders: (res) => {
      // Never let a stored file be interpreted as an executable document.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
    },
  })
);

// ----------------------------------------------------------------------------
// Health check
// ----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok', uptime: process.uptime() } });
});

// ----------------------------------------------------------------------------
// Routes — mounted from ./routes/*.js (created in the next phase)
// ----------------------------------------------------------------------------
app.use('/api', require('./routes/orders-payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/products', require('./routes/products'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/discount-codes', require('./routes/discount-codes'));
app.use('/api', require('./routes/inquiries-reviews-press'));
app.use('/api/content', require('./routes/posts'));
app.use('/api/content', require('./routes/content'));
app.use('/api/media', require('./routes/media'));

// ----------------------------------------------------------------------------
// 404 + error handling
// ----------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  // Multer's own errors (file-too-large, too-many-files, wrong field name,
  // ...) never set `.status` either — same class of bug as the fileFilter
  // rejection in lib/upload.js (found during admin-panel QA), just a
  // different trigger. A oversized upload was reading back as 500 "server
  // error" instead of 400 "your file is too big".
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AURA & CO API server listening on port ${PORT}`);
});
