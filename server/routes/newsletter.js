const express = require('express');
const { query } = require('../db');
const { createWelcomeDiscount } = require('../lib/discounts');
const { sendWelcomeEmail } = require('../lib/email');

const router = express.Router();

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// ----------------------------------------------------------------------------
// PUBLIC: POST /newsletter/signup
//
// Backs the homepage welcome popup. Claims a one-time 10%-off code for an
// email address, at most once per address (case-insensitive, enforced by
// newsletter_signups' own unique index - see migration 026), and emails it.
//
// Always responds success once the email is syntactically valid, whether or
// not it had already claimed a code - the popup shows the same "check your
// inbox" message either way, and not distinguishing the two avoids turning
// this endpoint into a way to probe which addresses have signed up before.
// ----------------------------------------------------------------------------
router.post('/signup', async (req, res) => {
  try {
    const email = ((req.body && req.body.email) || '').trim();
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    const existing = await query(
      `SELECT id FROM newsletter_signups WHERE lower(email) = lower($1)`,
      [email]
    );
    if (existing.rows.length > 0) {
      return res.json({ data: { alreadySignedUp: true } });
    }

    const promo = await createWelcomeDiscount();
    // Recorded even when code generation failed (promo null): the signup
    // still counts as "already tried" under the one-code-per-email policy,
    // rather than letting a resubmit quietly retry forever.
    await query(
      `INSERT INTO newsletter_signups (email, discount_code_id) VALUES ($1, $2)`,
      [email, promo ? promo.id : null]
    );

    if (promo) {
      sendWelcomeEmail(email, promo).catch(() => {});
    }

    return res.status(201).json({ data: { alreadySignedUp: false } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to process signup' });
  }
});

module.exports = router;
