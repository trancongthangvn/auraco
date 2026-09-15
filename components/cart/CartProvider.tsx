"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CART_STORAGE_KEY, cartItemKey, type CartItem } from "@/lib/cart";
import { apiFetch } from "@/lib/api";

/** Live stock per product slug, as the public product list reports it. */
type StockEntry = {
  stock: number;
  /** Only variants still on sale appear in the public list. */
  variants: Record<number, number>;
};

type AddInput = Omit<CartItem, "qty"> & { qty?: number };

/** The Frequently Bought Together discount buys one unit of a companion at
 *  the bundle price, not an unlimited supply of them: a shopper wanting two
 *  gets the second at its normal price, on its own separate cart line (see
 *  cartItemKey, which keeps a bundle line distinct from a plain one). */
const BUNDLE_MAX_QTY = 1;

const capBundleQty = (item: Pick<CartItem, "bundleKeySlug">, qty: number) =>
  item.bundleKeySlug ? Math.min(BUNDLE_MAX_QTY, qty) : qty;

type CartContextValue = {
  items: CartItem[];
  /** False until the stored cart has been read from localStorage — lets
   *  cart-rendering pages (e.g. /cart) show a loading state instead of
   *  flashing "empty" for the one tick before hydration completes. */
  hydrated: boolean;
  totalQty: number;
  subtotal: number;
  addItem: (item: AddInput) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clear: () => void;
  /** The slide-out mini-cart (CartDrawer, mounted once in the storefront
   *  layout) — opened automatically after an add-to-cart, or by clicking
   *  the header bag icon. */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** A product card's quick-add cart icon, matching the reference site,
   *  doesn't add straight to the bag — it opens the drawer showing this one
   *  item with its own "Add to Bag" button, and only clicking that actually
   *  adds it (see `confirmPreview`). Null when no preview is pending. */
  previewItem: AddInput | null;
  showPreview: (item: AddInput) => void;
  confirmPreview: () => void;
  /**
   * True when this product (or this variant of it) has no stock left —
   * explicit request: an out-of-stock item can't go in the bag or be paid
   * for in any case. Unknown products (stock not loaded yet, or a product
   * no longer public) return false here; the orders API is the final check
   * and refuses them either way.
   */
  isOutOfStock: (slug: string, variantId?: number) => boolean;
  /** Lines already in the bag that have since run out — checkout waits on these. */
  outOfStockItems: CartItem[];
  /** A bundle companion's real per-unit price right now: `bundlePrice` while
   *  its `bundleKeySlug` is still also in the cart, `price` otherwise (never
   *  set, or the key was removed). Recomputed from `items` on every render —
   *  same live-derivation shape as `isOutOfStock` — so removing the key
   *  product reverts the companion's price on the very next render with no
   *  extra event wiring. Everywhere a line's per-unit price is shown or
   *  summed (subtotal below, the bag list, checkout's line items) must read
   *  this instead of `item.price` directly, or the display would keep
   *  showing/charging the bundle price after its key left the cart. */
  effectivePrice: (item: CartItem) => number;
  /** The price to show struck through next to `effectivePrice`, or undefined
   *  when this line isn't discounted. While a bundle price is in effect that
   *  is the companion's normal price (what Frequently Bought Together itself
   *  strikes through); otherwise it's the product's own sitewide "was"
   *  price. Kept here rather than in each view so the bag, cart page and
   *  checkout can't drift apart on which number to strike. */
  compareAtFor: (item: CartItem) => number | undefined;
  /** Re-reads stock, e.g. when checkout opens, so it judges current numbers. */
  refreshStock: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Client-only, same pattern as CurrencyProvider: a localStorage-backed
 * useState. Starting empty on every render keeps the server and first
 * client paint in agreement; the stored cart is applied after mount.
 *
 * Same-tab consumers (Header badge, /cart, checkout) all read this one
 * Context instance, so a state update here is enough to keep them in sync —
 * no event bus needed. The `storage` event below only ever fires in *other*
 * tabs, which is exactly the gap Context can't cover.
 */
export default function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<AddInput | null>(null);
  const [stockBySlug, setStockBySlug] = useState<Record<string, StockEntry> | null>(null);
  // The same map, readable inside an add that had to wait for it (state in
  // that closure would still be the value from before the wait), plus the
  // one in-flight load every early add can share.
  const stockRef = useRef<Record<string, StockEntry> | null>(null);
  const stockLoadRef = useRef<Promise<void> | null>(null);

  const loadStock = useCallback(async () => {
    try {
      const list = await apiFetch<
        { slug: string; stock: number; variants?: { id: number; stock: number }[] }[]
      >("/api/products");
      const next: Record<string, StockEntry> = {};
      for (const p of list) {
        next[p.slug] = {
          stock: Number(p.stock),
          variants: Object.fromEntries((p.variants ?? []).map((v) => [v.id, Number(v.stock)])),
        };
      }
      stockRef.current = next;
      setStockBySlug(next);
    } catch {
      // Stock unavailable — the storefront can't pre-empt here, but the
      // orders API still refuses out-of-stock items at checkout.
    }
  }, []);

  const refreshStock = useCallback(() => {
    const load = loadStock().finally(() => {
      if (stockLoadRef.current === load) stockLoadRef.current = null;
    });
    stockLoadRef.current = load;
    return load;
  }, [loadStock]);

  // Deferred with queueMicrotask, the same pattern the stored-cart load
  // above uses: the state update lands after the fetch, never synchronously
  // inside the effect body.
  useEffect(() => {
    queueMicrotask(() => {
      void refreshStock();
    });
  }, [refreshStock]);

  const stockSays = (map: Record<string, StockEntry> | null, slug: string, variantId?: number) => {
    const entry = map?.[slug];
    if (!entry) return false;
    if (variantId != null) {
      // A variant missing from the public list has been taken off sale.
      const variantStock = entry.variants[variantId];
      return variantStock === undefined || variantStock <= 0;
    }
    return entry.stock <= 0;
  };

  const isOutOfStock = (slug: string, variantId?: number) =>
    stockSays(stockBySlug, slug, variantId);

  useEffect(() => {
    queueMicrotask(() => {
      setItems(readStoredCart());
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    // Skip the pre-hydration render, or this overwrites a real stored cart
    // with the empty initial state before it's had a chance to load.
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage unavailable — the cart just won't persist across visits.
    }
  }, [items, hydrated]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === CART_STORAGE_KEY) setItems(readStoredCart());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addItem = (input: AddInput) => {
    // The one place every add-to-bag control goes through (product page,
    // product cards, Frequently bought together, the bag's own "Why Not
    // Add"), so refusing here covers them all, including any added later.
    // Those controls also show themselves as unavailable; this is the
    // backstop for when they don't.
    //
    // Until live stock has loaded the answer isn't known, and letting the
    // add through then was a real hole (a click right after the page became
    // interactive put a sold-out item in the bag). So an early add waits for
    // the load and decides on the result instead of guessing.
    if (stockRef.current === null) {
      void (stockLoadRef.current ?? refreshStock()).then(() => {
        if (stockSays(stockRef.current, input.slug, input.variantId)) return;
        commitAdd(input);
      });
      return;
    }
    if (stockSays(stockRef.current, input.slug, input.variantId)) return;
    commitAdd(input);
  };

  const commitAdd = (input: AddInput) => {
    const key = cartItemKey(input);
    const qty = Math.max(1, input.qty ?? 1);
    setItems((list) => {
      const existing = list.find((it) => cartItemKey(it) === key);
      if (existing) {
        return list.map((it) =>
          cartItemKey(it) === key ? { ...it, qty: capBundleQty(it, it.qty + qty) } : it
        );
      }
      return [...list, { ...input, qty: capBundleQty(input, qty) }];
    });
    setDrawerOpen(true);
  };

  const showPreview = (item: AddInput) => {
    setPreviewItem(item);
    setDrawerOpen(true);
  };

  const confirmPreview = () => {
    if (!previewItem) return;
    addItem(previewItem);
    setPreviewItem(null);
  };

  const removeItem = (key: string) =>
    setItems((list) => list.filter((it) => cartItemKey(it) !== key));

  const updateQty = (key: string, qty: number) =>
    setItems((list) =>
      list.map((it) =>
        cartItemKey(it) === key ? { ...it, qty: capBundleQty(it, Math.max(1, qty)) } : it
      )
    );

  const clear = () => setItems([]);

  const outOfStockItems = items.filter((it) => isOutOfStock(it.slug, it.variantId));

  const effectivePrice = (item: CartItem) =>
    item.bundleKeySlug &&
    item.bundlePrice !== undefined &&
    items.some((it) => it.slug === item.bundleKeySlug)
      ? item.bundlePrice
      : item.price;

  const compareAtFor = (item: CartItem) => {
    const effective = effectivePrice(item);
    if (effective < item.price) return item.price;
    return item.compareAtPrice && item.compareAtPrice > effective
      ? item.compareAtPrice
      : undefined;
  };

  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  const subtotal = items.reduce((sum, it) => sum + effectivePrice(it) * it.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        hydrated,
        totalQty,
        subtotal,
        addItem,
        removeItem,
        updateQty,
        clear,
        drawerOpen,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => {
          setDrawerOpen(false);
          setPreviewItem(null);
        },
        previewItem,
        showPreview,
        confirmPreview,
        isOutOfStock,
        outOfStockItems,
        effectivePrice,
        compareAtFor,
        refreshStock,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
