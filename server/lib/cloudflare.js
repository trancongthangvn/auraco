// Purges specific /uploads/<file> URLs from the Cloudflare cache in front of
// https://aura.maxmin.vn. Deleting a file's own copy on disk (server/routes/
// media.js) was already correct on both environments — they share one
// uploads store (see DEPLOYMENT.md) — but the CDN kept serving its cached
// copy for up to 30 days (`Cache-Control: public, max-age=2592000` set in
// server/index.js's static handler) regardless, since nothing ever told
// Cloudflare the file was gone. Found during admin-panel QA.
//
// CF_API_TOKEN / CF_ZONE_ID are read from server/.env (gitignored, written
// directly on the container — see DEPLOYMENT.md's "Environment files").
// Both are optional: a deploy that hasn't configured them (a fresh local
// dev checkout, for instance) just skips the purge with a console warning
// instead of failing the delete itself — a stale CDN cache is a real but
// non-fatal problem, whereas failing to delete a file the admin explicitly
// asked to remove would be worse.
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_ZONE_ID = process.env.CF_ZONE_ID;
const PRODUCTION_ORIGIN = 'https://aura.maxmin.vn';

/**
 * Purges one or more /uploads/<file>-relative paths from Cloudflare's cache.
 * Always targets the production origin — that's the only domain actually
 * behind Cloudflare (staging is a bare LAN IP:port with no CDN in front of
 * it), and since both environments read from the same shared uploads store
 * now, a file deleted from either side needs the *production* URL purged.
 *
 * Never throws — a purge failure is logged and swallowed so it can't turn a
 * successful file deletion into a 500 for the admin.
 *
 * @param {string[]} filenames - e.g. ["1788557010441-fc4e1605bf252b78.png"]
 */
async function purgeUploadedFiles(filenames) {
  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    console.warn(
      '[cloudflare] CF_API_TOKEN/CF_ZONE_ID not configured — skipping cache purge for:',
      filenames
    );
    return;
  }
  const files = filenames.map((f) => `${PRODUCTION_ORIGIN}/uploads/${f}`);
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files }),
      }
    );
    const body = await res.json();
    if (!body.success) {
      console.error('[cloudflare] purge_cache failed:', JSON.stringify(body.errors));
    }
  } catch (err) {
    console.error('[cloudflare] purge_cache request failed:', err);
  }
}

module.exports = { purgeUploadedFiles };
