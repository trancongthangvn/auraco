"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CART_STORAGE_KEY, cartItemKey, type CartItem } from "@/lib/cart";

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
