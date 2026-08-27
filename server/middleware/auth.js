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

module.exports = { authMiddleware, requireAdmin };
