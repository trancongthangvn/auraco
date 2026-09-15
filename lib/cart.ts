export type CartItem = {
  /** Numeric product id, needed by the orders API at checkout. Not every
   *  add-to-cart call site has it on hand (some product-card data comes from
   *  a mapper that only carries `slug`) — when absent, checkout resolves it
   *  from `slug` via `GET /api/products/:slug` before submitting the order. */
  productId?: number;
  slug: string;
  name: string;
  /** Free-text material label (e.g. "18k Rose Gold Vermeil") shown under the
   *  name on cart/checkout — optional since not every add-to-cart call site
   *  has it handy. */
  material?: string;
  price: number;
  image: string | null;
  qty: number;
  /** Set once the product-variants API lands; a line without one is a
   *  variant-less product (today, every product). */
  variantId?: number;
  variantLabel?: string;
  /** Set when this line was added as a Frequently Bought Together companion
   *  (see FrequentlyBoughtTogether.tsx) — the slug of the "key" product this
   *  companion's discount is conditional on. `price` above always stays this
   *  companion's normal, un-bundled price; `bundlePrice` is what it's charged
   *  instead while `bundleKeySlug` is still also in the cart. Removing the
   *  key product (CartProvider.removeItem) makes the companion fall back to
   *  `price` again on the very next render — see CartProvider.effectivePrice. */
  bundleKeySlug?: string;
  bundlePrice?: number;
};

export const CART_STORAGE_KEY = "aura-cart";

/** Two lines are "the same" (and should merge qty rather than duplicate) when
 *  they share a product AND a variant — a plain product and one of its
 *  variants are different lines. Keyed by `slug`, not `productId`: every
 *  add-to-cart call site has a slug on hand, but none currently carries a
 *  numeric id (FullProduct/Product don't expose one anywhere) — keying on
 *  productId meant every item's key collapsed to the same "undefined"
 *  string, silently merging unrelated products into one cart line.
 *
 *  A bundle-discounted companion is its own line too, separate from any
 *  plain line of the same product: the discount covers exactly one unit
 *  (see CartProvider's BUNDLE_MAX_QTY), so buying more of that product
 *  has to sit on its own full-price line rather than silently extending
 *  the discount to every extra unit. */
export function cartItemKey(item: Pick<CartItem, "slug" | "variantId" | "bundleKeySlug">) {
  const base = item.variantId != null ? `${item.slug}:${item.variantId}` : item.slug;
  return item.bundleKeySlug ? `${base}:bundle:${item.bundleKeySlug}` : base;
}
