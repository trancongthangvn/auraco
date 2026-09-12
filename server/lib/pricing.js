// server/lib/pricing.js
//
// products.discount_percent (migration 006) is the per-product "card
// discount": admin enters a percentage and the storefront is meant to show
// the original price struck through next to the reduced one. The column was
// being written by the admin form but read by nothing — every public
// surface kept showing the full price, so the discount had no effect at all
// (bug report: "admin đã có giảm giá nhưng ngoài trang công khai giá vẫn
// như cũ").
//
// Applying it here, at the API boundary, rather than in the storefront's own
// mappers is deliberate: product rows reach the storefront through several
// independent paths (lib/catalog-mappers.ts's toFullProduct, the cart and
// homepage carousel mappers, the header search, the bundle endpoint), and
// fixing only one of them would leave the others showing a different price
// for the same product. Discounting once, server-side, also keeps the price
// a customer is CHARGED (orders-payments.js snapshots products.price at
// checkout) in step with the price they were SHOWN — otherwise the card
// would advertise a discount the order never applied.
//
// Admin routes deliberately do NOT go through this: the admin form edits the
// raw price and the raw percentage, and must keep seeing both unchanged.

/** Rounds to 2 decimals the way money should be, avoiding 104.00000000000001. */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * The unit price actually charged for a product row: its stored price less
 * its card discount. Takes the raw DB row (NUMERIC columns arrive as
 * strings via `pg`) and returns a Number.
 */
function discountedUnitPrice(row) {
  const price = Number(row.price);
  const percent = Number(row.discount_percent);
  if (!Number.isFinite(price)) return 0;
  if (!Number.isFinite(percent) || percent <= 0) return round2(price);
  return round2(price * (1 - percent / 100));
}

/**
 * Returns a copy of a public product row with the card discount applied:
 * `price` becomes the discounted price and `compare_at_price` becomes the
 * struck-through original. An existing compare_at_price (the manually-set
 * "was" price, a separate feature) is left alone and keeps precedence as
 * the strikethrough value — the two are independent per migration 006, and
 * on a product using both, the higher manual "was" price is the meaningful
 * one to show. A product with no discount comes back untouched.
 *
 * Values are returned as fixed-2 strings, matching how `pg` hands back
 * NUMERIC columns, so nothing downstream sees a shape change.
 */
function applyCardDiscount(row) {
  const percent = Number(row.discount_percent);
  if (!Number.isFinite(percent) || percent <= 0) return row;
  const original = Number(row.price);
  const discounted = discountedUnitPrice(row);
  return {
    ...row,
    price: discounted.toFixed(2),
    compare_at_price:
      row.compare_at_price != null ? row.compare_at_price : original.toFixed(2),
  };
}

module.exports = { applyCardDiscount, discountedUnitPrice };
