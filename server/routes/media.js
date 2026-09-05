const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware, requireStaffOrAdmin, requireAdmin } = require('../middleware/auth');
const { upload, verifyMagicBytes, UPLOAD_DIR } = require('../lib/upload');
const { purgeUploadedFiles } = require('../lib/cloudflare');

const router = express.Router();

// Only these show up in the library grid — video/QR/proof-of-payment files
// also live in UPLOAD_DIR (one flat directory, see lib/upload.js) but aren't
// "images to reuse" in the sense this page is for.
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// Matches lib/upload.js's own generated filenames exactly (`<timestamp>-
// <16 hex chars><ext>`) — the only shape a filename from this directory can
// have, since nothing ever writes here under a client-supplied name. Used to
// reject path traversal / arbitrary-file access on the delete route below.
const SAFE_FILENAME = /^\d+-[0-9a-f]{16}\.(jpg|jpeg|png|webp|gif|mp4)$/i;

// ----------------------------------------------------------------------------
// GET /media/admin/images — list every previously uploaded image, newest
// first (filenames are `<timestamp>-<random><ext>`, so a plain string sort
// descending is already newest-first).
// ----------------------------------------------------------------------------
router.get('/admin/images', authMiddleware, requireStaffOrAdmin, (req, res) => {
  try {
    const files = fs
      .readdirSync(UPLOAD_DIR)
      .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .sort()
      .reverse();
    const data = files.map((filename) => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, filename));
      return { filename, url: `/uploads/${filename}`, size: stat.size, uploadedAt: stat.mtime };
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list media library' });
  }
});

// ----------------------------------------------------------------------------
// POST /media/admin/images — upload one image into the shared library.
// Same validation as every other image upload in the app (MIME whitelist +
// magic-byte check, server-generated filename) — see lib/upload.js.
// ----------------------------------------------------------------------------
router.post(
  '/admin/images',
  authMiddleware,
  requireStaffOrAdmin,
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided (expected field "image")' });
    }
    if (!req.file.mimetype.startsWith('image/')) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Only image files are allowed here' });
    }
    const ok = verifyMagicBytes(req.file.path, req.file.mimetype);
    if (!ok) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'File content does not match declared type' });
    }
    const filename = path.basename(req.file.path);
    const stat = fs.statSync(req.file.path);
    res.status(201).json({
      data: { filename, url: `/uploads/${filename}`, size: stat.size, uploadedAt: stat.mtime },
    });
  }
);

// ----------------------------------------------------------------------------
// DELETE /media/admin/images/:filename — admin only (a shared library file
// may already be referenced by several products/pages, so removing one is
// more consequential than a single product's own image field).
// ----------------------------------------------------------------------------
router.delete('/admin/images/:filename', authMiddleware, requireAdmin, (req, res) => {
  const { filename } = req.params;
  if (!SAFE_FILENAME.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
    // Fire-and-forget: the file is already gone from disk (the part the
    // admin is actually waiting on), so this response doesn't wait on
    // Cloudflare's own round-trip, and a purge failure (logged, never
    // thrown — see lib/cloudflare.js) can't turn a successful delete into
    // an error response.
    purgeUploadedFiles([filename]);
    res.json({ data: { filename } });
  });
});

module.exports = router;
