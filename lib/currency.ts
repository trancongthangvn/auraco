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

/**
 * Every price in this codebase is stored and charged in USD — there is no
 * exchange-rate data behind this picker. Switching currency swaps the
 * symbol/code on browsing surfaces only (product cards, product page,
 * "frequently bought together"); it leaves the number itself untouched
 * rather than pretending to convert it. Cart, checkout and admin order
 * views stay in USD on purpose — those are the pages where money actually
 * changes hands, and showing a EUR/GBP figure that doesn't match the real
 * USD charge would be misleading right where a customer is about to pay.
 */
export function formatPrice(value: number, currency: Currency): string {
  const { symbol } = currencyMeta[currency];
  return `${symbol}${value.toFixed(2)} ${currency}`;
}
