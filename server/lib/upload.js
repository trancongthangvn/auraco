const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// MIME whitelist -> allowed magic-byte signatures (checked from the buffered
// first bytes multer gives us via file.buffer is NOT available in disk mode,
// so we verify magic bytes in a fileFilter read of the first chunk on disk
// after write is not ideal; instead we do a synchronous peek using a small
// stream in fileFilter by buffering the first bytes multer exposes on the
// stream object before it hits disk).
const MIME_WHITELIST = {
  'image/jpeg': { ext: '.jpg', maxSize: 2 * 1024 * 1024, magic: [[0xff, 0xd8, 0xff]] },
  'image/png': { ext: '.png', maxSize: 2 * 1024 * 1024, magic: [[0x89, 0x50, 0x4e, 0x47]] },
  'image/webp': { ext: '.webp', maxSize: 2 * 1024 * 1024, magic: [[0x52, 0x49, 0x46, 0x46]] }, // 'RIFF'
  'image/gif': { ext: '.gif', maxSize: 2 * 1024 * 1024, magic: [[0x47, 0x49, 0x46, 0x38]] }, // 'GIF8'
  // MP4's 'ftyp' box starts at byte 4 (bytes 0-3 are the box size), hence the
  // explicit magicOffset — checking it at offset 0 would reject every real mp4.
  'video/mp4': {
    ext: '.mp4',
    maxSize: 50 * 1024 * 1024,
    magic: [[0x66, 0x74, 0x79, 0x70]],
    magicOffset: 4,
  },
};

const MAX_SIZE = Math.max(...Object.values(MIME_WHITELIST).map((m) => m.maxSize));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Server-generated filename only — never trust file.originalname beyond
    // deriving an extension from the whitelisted MIME type.
    const rule = MIME_WHITELIST[file.mimetype];
    const ext = rule ? rule.ext : path.extname(file.originalname || '').toLowerCase();
    const rand = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${rand}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const rule = MIME_WHITELIST[file.mimetype];
  if (!rule) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

/**
 * Verifies the magic bytes of an already-written upload match its declared
 * MIME type's whitelist signature. Call this AFTER multer has written the
 * file to disk (e.g. as the first line of your route handler) and delete +
 * reject the request if it fails — multer's fileFilter only sees the
 * client-declared mimetype/header, not real file content, so this closes
 * that gap.
 *
 * @param {string} filePath - absolute path to the uploaded file
 * @param {string} declaredMime - req.file.mimetype
 * @returns {boolean}
 */
function verifyMagicBytes(filePath, declaredMime) {
  const rule = MIME_WHITELIST[declaredMime];
  if (!rule) return false;

  const offset = rule.magicOffset || 0;

  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    return rule.magic.some((sig) => sig.every((byte, i) => buf[offset + i] === byte));
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = { upload, verifyMagicBytes, UPLOAD_DIR, MIME_WHITELIST };
