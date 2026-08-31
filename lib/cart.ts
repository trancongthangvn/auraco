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
};

export const CART_STORAGE_KEY = "aura-cart";

/** Two lines are "the same" (and should merge qty rather than duplicate) when
 *  they share a product AND a variant — a plain product and one of its
 *  variants are different lines. */
export function cartItemKey(item: Pick<CartItem, "productId" | "variantId">) {
  return item.variantId != null
    ? `${item.productId}:${item.variantId}`
    : `${item.productId}`;
}
