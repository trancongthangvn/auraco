// server/lib/discounts.js
//
// Single-use discount codes generated for a customer rather than typed in by
// an admin: the "thank you" code mailed alongside an order confirmation (see
// routes/orders-payments.js), and the "welcome" code mailed after a
// newsletter signup (see routes/newsletter.js). Each is its own row in
// discount_codes — usage_limit 1 is what makes it single-use. Nothing here
// binds a code to a customer's identity; the code itself, known only to
// whoever received that one email, is what keeps it theirs in practice.
//
// Never throws: a failure here must not block order creation, the signup
// response, or the email that follows either, so every caller treats a null
// return as "no code this time" rather than an error to handle.

const { query } = require('../db');

// Excludes 0/O and 1/I/L — the pairs a customer is most likely to misread
// off a screen or a screenshot when typing the code back in at checkout.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_SUFFIX_LENGTH = 6;
const DISCOUNT_PERCENT = 10;
const VALID_DAYS = 90;

function randomCode(prefix) {
  let suffix = '';
  for (let i = 0; i < CODE_SUFFIX_LENGTH; i++) {
    suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `${prefix}${suffix}`;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Creates a single-use, no-minimum-order 10%-off code with the given code
 * prefix (e.g. 'THANKS', 'WELCOME') and returns { id, code, value, endDate },
 * or null if it could not be created.
 */
async function createSingleUseDiscount(prefix) {
  const today = new Date();
  const expires = new Date(today);
  expires.setDate(expires.getDate() + VALID_DAYS);

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode(prefix);
    try {
      const result = await query(
        `INSERT INTO discount_codes
           (code, type, value, min_order, usage_limit, start_date, end_date, active)
         VALUES ($1, 'percent', $2, 0, 1, $3, $4, TRUE)
         RETURNING id`,
        [code, DISCOUNT_PERCENT, isoDate(today), isoDate(expires)]
      );
      return { id: result.rows[0].id, code, value: DISCOUNT_PERCENT, endDate: isoDate(expires) };
    } catch (err) {
      // 23505 = unique_violation on the code column — astronomically rare
      // with a 6-char, 32-symbol suffix, but cheap to just retry with a new
      // random code rather than fail the whole thing over a collision.
      if (err.code === '23505') continue;
      console.error(`[discounts] Failed to create a ${prefix} code`, err);
      return null;
    }
  }
  console.error(`[discounts] Gave up generating a unique ${prefix} code after 3 attempts`);
  return null;
}

function createThankYouDiscount() {
  return createSingleUseDiscount('THANKS');
}

function createWelcomeDiscount() {
  return createSingleUseDiscount('WELCOME');
}

module.exports = { createThankYouDiscount, createWelcomeDiscount };
