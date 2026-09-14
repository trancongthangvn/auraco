// server/lib/customerAuth.js
//
// Authentication for storefront customer accounts — kept apart from the
// admin panel's on purpose.
//
// Customer tokens are signed with a DIFFERENT key from admin tokens. Several
// admin routes (GET /admin/me, POST /admin/change-password) only check that a
// token verifies, then look the user up by its numeric id. If customer tokens
// shared JWT_SECRET, customer #1's token would verify there and return admin
// #1's profile. A separate key means a customer token can never pass the
// admin middleware, and vice versa.
//
// The key is CUSTOMER_JWT_SECRET when set, otherwise derived from JWT_SECRET
// with HMAC so no new env var is required to deploy.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const TOKEN_TTL = '30d';

function customerSecret() {
  if (process.env.CUSTOMER_JWT_SECRET) return process.env.CUSTOMER_JWT_SECRET;
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update('aura-customer-tokens').digest('hex');
}

function signCustomerToken(customer) {
  return jwt.sign({ sub: customer.id, typ: 'customer' }, customerSecret(), { expiresIn: TOKEN_TTL });
}

/** Returns the customer id a token belongs to, or null if absent/invalid. */
function verifyCustomerToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = jwt.verify(token, customerSecret());
    return payload && payload.typ === 'customer' && Number.isInteger(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Express middleware: requires "Authorization: Bearer <customer token>". */
function requireCustomer(req, res, next) {
  const [scheme, token] = (req.headers['authorization'] || '').split(' ');
  const id = scheme === 'Bearer' ? verifyCustomerToken(token) : null;
  if (!id) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.customerId = id;
  next();
}

module.exports = { signCustomerToken, verifyCustomerToken, requireCustomer };
