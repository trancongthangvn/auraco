const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '30d';

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ============================================================================
// Auth
// ============================================================================

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const result = await query('SELECT * FROM admin_users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken(user);
    return res.status(200).json({ data: { token, user: toPublicUser(user) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT * FROM admin_users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    return res.status(200).json({ data: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};

    if (
      !current_password ||
      !new_password ||
      typeof current_password !== 'string' ||
      typeof new_password !== 'string'
    ) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'new_password must be at least 8 characters' });
    }

    const result = await query('SELECT * FROM admin_users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const passwordMatches = await bcrypt.compare(current_password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await query('UPDATE admin_users SET password_hash = $1, updated_at = now() WHERE id = $2', [
      newHash,
      user.id,
    ]);

    return res.status(200).json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// admin_users management (admin-only)
// ============================================================================

// GET /api/admin/users
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT * FROM admin_users ORDER BY created_at DESC');
    return res.status(200).json({ data: result.rows.map(toPublicUser) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users
router.post('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { username, password, display_name, role, active } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'username is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password is required and must be at least 8 characters' });
    }
    if (!display_name || typeof display_name !== 'string' || !display_name.trim()) {
      return res.status(400).json({ error: 'display_name is required' });
    }
    const finalRole = role || 'staff';
    if (!['admin', 'staff'].includes(finalRole)) {
      return res.status(400).json({ error: "role must be 'admin' or 'staff'" });
    }

    const existing = await query('SELECT id FROM admin_users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await query(
      `INSERT INTO admin_users (username, password_hash, display_name, role, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [username, passwordHash, display_name, finalRole, active === undefined ? true : !!active]
    );

    return res.status(201).json({ data: toPublicUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const existingResult = await query('SELECT * FROM admin_users WHERE id = $1', [id]);
    const existing = existingResult.rows[0];
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { username, password, display_name, role, active } = req.body || {};

    if (role !== undefined && !['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: "role must be 'admin' or 'staff'" });
    }
    if (password !== undefined && (typeof password !== 'string' || password.length < 8)) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    if (username !== undefined && (typeof username !== 'string' || !username.trim())) {
      return res.status(400).json({ error: 'username cannot be empty' });
    }
    if (display_name !== undefined && (typeof display_name !== 'string' || !display_name.trim())) {
      return res.status(400).json({ error: 'display_name cannot be empty' });
    }

    if (username !== undefined && username !== existing.username) {
      const dupe = await query('SELECT id FROM admin_users WHERE username = $1 AND id != $2', [
        username,
        id,
      ]);
      if (dupe.rows.length > 0) {
        return res.status(400).json({ error: 'username already exists' });
      }
    }

    const passwordHash = password !== undefined ? await bcrypt.hash(password, SALT_ROUNDS) : existing.password_hash;

    const result = await query(
      `UPDATE admin_users
       SET username = $1,
           password_hash = $2,
           display_name = $3,
           role = $4,
           active = $5,
           updated_at = now()
       WHERE id = $6
       RETURNING *`,
      [
        username !== undefined ? username : existing.username,
        passwordHash,
        display_name !== undefined ? display_name : existing.display_name,
        role !== undefined ? role : existing.role,
        active !== undefined ? !!active : existing.active,
        id,
      ]
    );

    return res.status(200).json({ data: toPublicUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query('DELETE FROM admin_users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
