"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { cartItemKey } from "@/lib/cart";
import { apiFetch } from "@/lib/api";
import { CloseIcon, MinusIcon, PlusIcon } from "@/components/icons";

type BundleCompanion = {
  slug: string;
  name: string;
  price: number;
  image?: string;
};

/**
 * "Why not add" — bundle companions (admin-curated in Mua cùng nhau, see
 * app/admin/products/page.tsx) for whatever's currently in the cart, minus
 * whatever's already in the cart. Deliberately does NOT show the reference
 * site's single big featured-product box above the bag list — the project
 * owner asked to drop that, keep only this suggestions rail.
 */
function useWhyNotAdd(cartSlugs: string[]) {
  const [suggestions, setSuggestions] = useState<BundleCompanion[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Promise.all([]) resolves to [] immediately, so an empty cart naturally
    // clears suggestions through the same path below — no separate branch
    // (and no synchronous setState in the effect body) needed.
    Promise.all(
      cartSlugs.map((slug) =>
        apiFetch<{ companions: BundleCompanion[] }>(
          `/api/products/${encodeURIComponent(slug)}/bundle`
        ).catch(() => ({ companions: [] as BundleCompanion[] }))
      )
    ).then((results) => {
      if (cancelled) return;
      const seen = new Set(cartSlugs);
      const merged: BundleCompanion[] = [];
      for (const { companions } of results) {
        for (const c of companions) {
          if (seen.has(c.slug)) continue;
          seen.add(c.slug);
          merged.push(c);
        }
      }
      setSuggestions(merged.slice(0, 4));
    });
    return () => {
      cancelled = true;
    };
    // cartSlugs is a derived array (new reference every render) — join it to
    // a stable string so this only re-fetches when the actual slugs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSlugs.join(",")]);

  return suggestions;
}

export default function CartDrawer() {
  const {
    items,
    drawerOpen,
    closeDrawer,
    totalQty,
    subtotal,
    updateQty,
    removeItem,
    addItem,
  } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const cartSlugs = items.map((it) => it.slug);
  const suggestions = useWhyNotAdd(cartSlugs);

  // Lock page scroll while the drawer is open, like any modal overlay.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Auto-close on navigation. The drawer's full-screen backdrop otherwise
  // stayed mounted across a route change (this component lives in the
  // shared layout, not the page, so it never remounts) and silently ate
  // clicks meant for the new page underneath — "Add to Bag" looked broken
  // because the click was actually landing on the invisible backdrop
  // instead. Fires once on the initial mount too, which is a harmless no-op
  // since the drawer starts closed.
  const closeDrawerRef = useRef(closeDrawer);
  useEffect(() => {
    closeDrawerRef.current = closeDrawer;
  });
  useEffect(() => {
    closeDrawerRef.current();
  }, [pathname]);

  if (!drawerOpen) return null;

  const money = (v: number) => `$${v.toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close bag"
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/30"
      />
      <div className="relative flex h-full w-full max-w-[420px] flex-col bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="font-ui text-[13px] font-semibold uppercase tracking-[0.08em] text-[#2b261f]">
            Your Bag ({totalQty})
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={closeDrawer}
            className="text-black/50 hover:text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-black/50">
              Your bag is empty.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const key = cartItemKey(item);
                return (
                  <li key={key} className="flex gap-3 border-b border-black/10 pb-4">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={closeDrawer}
                      className="relative block h-16 w-16 shrink-0 overflow-hidden bg-[#f5f2ee]"
                    >
                      {item.image && (
                        <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={closeDrawer}
                          className="text-[13px] font-medium text-[#2b261f] hover:text-gold"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeItem(key)}
                          className="shrink-0 text-black/40 hover:text-ink"
                        >
                          <CloseIcon size={14} />
                        </button>
                      </div>
                      {item.variantLabel && (
                        <p className="mt-0.5 text-xs text-black/50">{item.variantLabel}</p>
                      )}
                      <p className="mt-1 text-[13px] text-[#2b261f]">{money(item.price)}</p>
                      <div className="mt-1.5 flex h-6 w-[68px] items-center justify-between rounded-full border border-black/15 px-1.5">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQty(key, item.qty - 1)}
                          className="flex h-full items-center justify-center text-[#2b261f] hover:text-gold"
                        >
                          <MinusIcon size={10} />
                        </button>
                        <span className="text-xs">{item.qty}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQty(key, item.qty + 1)}
                          className="flex h-full items-center justify-center text-[#2b261f] hover:text-gold"
                        >
                          <PlusIcon size={10} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {suggestions.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 font-ui text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5c554a]">
                Why Not Add
              </p>
              <ul className="space-y-3">
                {suggestions.map((s) => (
                  <li key={s.slug} className="flex items-center gap-3">
                    <Link
                      href={`/product/${s.slug}`}
                      onClick={closeDrawer}
                      className="relative block h-12 w-12 shrink-0 overflow-hidden bg-[#f5f2ee]"
                    >
                      {s.image && (
                        <Image src={s.image} alt={s.name} fill sizes="48px" className="object-cover" />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-[#2b261f]">{s.name}</p>
                      <p className="text-xs text-black/50">{money(s.price)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        addItem({
                          slug: s.slug,
                          name: s.name,
                          price: s.price,
                          image: s.image ?? null,
                        })
                      }
                      className="shrink-0 rounded-full border border-[#28241f] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#28241f] hover:bg-black/5"
                    >
                      Add to Bag
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-black/10 px-5 py-4">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <p className="mb-4 text-xs text-black/50">
              Have a discount code? Enter it at checkout.
            </p>
            <button
              type="button"
              onClick={() => {
                closeDrawer();
                router.push("/checkout");
              }}
              className="flex h-11 w-full items-center justify-center border border-[#111] bg-[#111] text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85"
            >
              Secure Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
