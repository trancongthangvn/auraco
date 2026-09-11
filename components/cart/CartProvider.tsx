"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CART_STORAGE_KEY, cartItemKey, type CartItem } from "@/lib/cart";
import { apiFetch } from "@/lib/api";

/** Live stock per product slug, as the public product list reports it. */
type StockEntry = {
  stock: number;
  /** Only variants still on sale appear in the public list. */
  variants: Record<number, number>;
};

type AddInput = Omit<CartItem, "qty"> & { qty?: number };

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

  const refreshStock = useCallback(async () => {
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
      setStockBySlug(next);
    } catch {
      // Stock unavailable — the storefront can't pre-empt here, but the
      // orders API still refuses out-of-stock items at checkout.
    }
  }, []);

  // Deferred with queueMicrotask, the same pattern the stored-cart load
  // above uses: the state update lands after the fetch, never synchronously
  // inside the effect body.
  useEffect(() => {
    queueMicrotask(() => {
      void refreshStock();
    });
  }, [refreshStock]);

  const isOutOfStock = (slug: string, variantId?: number) => {
    const entry = stockBySlug?.[slug];
    if (!entry) return false;
    if (variantId != null) {
      // A variant missing from the public list has been taken off sale.
      const variantStock = entry.variants[variantId];
      return variantStock === undefined || variantStock <= 0;
    }
    return entry.stock <= 0;
  };

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
    if (isOutOfStock(input.slug, input.variantId)) return;
    const key = cartItemKey(input);
    const qty = Math.max(1, input.qty ?? 1);
    setItems((list) => {
      const existing = list.find((it) => cartItemKey(it) === key);
      if (existing) {
        return list.map((it) =>
          cartItemKey(it) === key ? { ...it, qty: it.qty + qty } : it
        );
      }
      return [...list, { ...input, qty }];
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
        cartItemKey(it) === key ? { ...it, qty: Math.max(1, qty) } : it
      )
    );

  const clear = () => setItems([]);

  const outOfStockItems = items.filter((it) => isOutOfStock(it.slug, it.variantId));

  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

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
