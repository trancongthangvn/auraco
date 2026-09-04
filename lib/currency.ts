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
 * Every price in this codebase is stored and charged in USD. Explicit
 * request: browsing surfaces (product cards, catalog, "frequently bought
 * together") now convert the displayed number using an admin-set rate
 * (site_settings.extra.currency_rates, edited at Admin → Cài đặt website).
 * Cart, checkout and admin order views deliberately still call this with
 * rate=1 (or skip it) — those are the pages where money actually changes
 * hands, and showing a EUR/GBP figure that doesn't match the real USD
 * charge would be misleading right where a customer is about to pay.
 */
export function formatPrice(value: number, currency: Currency, rate: number = 1): string {
  const { symbol } = currencyMeta[currency];
  const converted = Number.isFinite(rate) && rate > 0 ? value * rate : value;
  return `${symbol}${converted.toFixed(2)} ${currency}`;
}
