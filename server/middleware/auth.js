const jwt = require('jsonwebtoken');

/**
 * Verifies "Authorization: Bearer <token>", attaches decoded payload to
 * req.user ({ id, username, role, display_name }). Responds 401 if missing
 * or invalid.
 */
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Must run after authMiddleware. Requires req.user.role === 'admin'.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

/**
 * Must run after authMiddleware. Requires req.user.role to be 'admin' or
 * 'staff' — i.e. any authenticated admin-panel user. Staff's role is scoped
 * to products + orders only by which routes this is applied to (see
 * server/routes/products.js and server/routes/orders-payments.js); every
 * other admin route stays behind requireAdmin.
 */
function requireStaffOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'staff')) {
    return res.status(403).json({ error: 'Staff or admin privileges required' });
  }
  next();
}

module.exports = { authMiddleware, requireAdmin, requireStaffOrAdmin };
