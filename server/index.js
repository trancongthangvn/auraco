require('dotenv').config();

const express = require('express');
const cors = require('cors');
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
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AURA & CO API server listening on port ${PORT}`);
});
