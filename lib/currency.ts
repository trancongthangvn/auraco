export const currencies = ["USD", "EUR", "GBP"] as const;
export type Currency = (typeof currencies)[number];

export const defaultCurrency: Currency = "USD";

export const currencyMeta: Record<Currency, { name: string; symbol: string }> = {
  USD: { name: "US Dollar", symbol: "$" },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
};

export const CURRENCY_STORAGE_KEY = "aura-currency";

export function isCurrency(value: string | undefined | null): value is Currency {
  return !!value && (currencies as readonly string[]).includes(value);
}

/** No admin-set rate yet (or the rate for USD itself) means "don't convert" —
 *  the safe default that reproduces the old symbol-only-swap behavior until
 *  an admin actually sets a rate. */
export const defaultCurrencyRates: Record<Currency, number> = {
  USD: 1,
  EUR: 1,
  GBP: 1,
};

/** All shown until an admin turns one off (Admin → Cài đặt website →
 *  Tỉ giá quy đổi → cột Active). USD is always forced true wherever this is
 *  read — it's the base currency prices are stored in, so hiding it would
 *  leave the picker with no valid default. */
export const defaultCurrencyActive: Record<Currency, boolean> = {
  USD: true,
  EUR: true,
  GBP: true,
};

/**
 * Every price in this codebase is stored and charged in USD. The displayed
 * number is converted with an admin-set rate
 * (site_settings.extra.currency_rates, edited at Admin → Cài đặt website).
 *
 * Cart and checkout used to be excluded from that conversion on the
 * reasoning that a EUR/GBP figure could be mistaken for the real USD
 * charge. In practice that read as a broken currency picker — switching to
 * GBP changed the flag in the header and not a single price (bug report:
 * "đổi giá tiền tệ nhưng giá trị k thay đổi") — so they convert too now.
 * What keeps it honest instead: this function always prints the currency
 * code next to the number, and the one place real money actually moves —
 * the Cash App / Zelle transfer instruction on the payment screen — still
 * states the amount in USD explicitly, whatever the display currency is.
 *
 * Admin order views stay in USD on purpose: that is the amount the store
 * was actually paid, not a browsing preference.
 */
export function formatPrice(value: number, currency: Currency, rate: number = 1): string {
  const { symbol } = currencyMeta[currency];
  const converted = Number.isFinite(rate) && rate > 0 ? value * rate : value;
  return `${symbol}${converted.toFixed(2)} ${currency}`;
}
