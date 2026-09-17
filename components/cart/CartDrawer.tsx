"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { cartItemKey } from "@/lib/cart";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatPrice } from "@/lib/currency";
import { apiFetch } from "@/lib/api";
import { CloseIcon, MinusIcon, PlusIcon } from "@/components/icons";

type BundleCompanion = {
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  image?: string;
};

type BundleSuggestion = BundleCompanion & {
  /** The cart product whose bundle suggested this one — its "key" product,
   *  the same role mainProduct plays in FrequentlyBoughtTogether. */
  keySlug: string;
  /** What this costs while bought alongside keySlug, and the price to strike
   *  through next to it. Equal to `price` / undefined when the key product's
   *  bundle has no discount configured. */
  bundlePrice: number;
  bundleCompareAt?: number;
};

/**
 * "Why not add" — bundle companions (admin-curated in Mua cùng nhau, see
 * app/admin/products/page.tsx) for whatever's currently in the cart, minus
 * whatever's already in the cart. Deliberately does NOT show the reference
 * site's single big featured-product box above the bag list — the project
 * owner asked to drop that, keep only this suggestions rail.
 *
 * Every suggestion here is by definition a companion of something already in
 * the bag, so the bundle discount applies to it — priced the same way
 * FrequentlyBoughtTogether's displayOf() prices its own rows, off the same
 * discountPercent from the same endpoint. This panel used to ignore that
 * field and quote the plain price, so the identical product was advertised
 * at two different prices depending on which panel the shopper looked at.
 */
function useWhyNotAdd(cartSlugs: string[]) {
  const [suggestions, setSuggestions] = useState<BundleSuggestion[]>([]);

  useEffect(() => {
    let cancelled = false;
    type BundleResponse = { companions: BundleCompanion[]; discountPercent?: number };
    // Promise.all([]) resolves to [] immediately, so an empty cart naturally
    // clears suggestions through the same path below — no separate branch
    // (and no synchronous setState in the effect body) needed.
    Promise.all(
      cartSlugs.map((slug) =>
        apiFetch<BundleResponse>(`/api/products/${encodeURIComponent(slug)}/bundle`)
          .then((data) => ({ ...data, keySlug: slug }))
          .catch(() => ({
            companions: [] as BundleCompanion[],
            discountPercent: 0,
            keySlug: slug,
          }))
      )
    ).then((results) => {
      if (cancelled) return;
      const seen = new Set(cartSlugs);
      const merged: BundleSuggestion[] = [];
      for (const { companions, discountPercent, keySlug } of results) {
        const pct = Number(discountPercent) || 0;
        for (const c of companions) {
          if (seen.has(c.slug)) continue;
          seen.add(c.slug);
          merged.push({
            ...c,
            keySlug,
            bundlePrice: pct > 0 ? Math.round(c.price * (1 - pct / 100) * 100) / 100 : c.price,
            bundleCompareAt: pct > 0 ? c.price : (c.compareAtPrice ?? undefined),
          });
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

/**
 * What adding a suggestion puts in the bag — the same shape
 * FrequentlyBoughtTogether builds for its companions, so a product added
 * from here obeys the identical rules: `price` is the normal price it falls
 * back to if its key product leaves the bag, `bundlePrice` is what it's
 * charged while the key is still there (CartProvider's effectivePrice), and
 * the discount covers one unit only.
 */
function addInputFor(s: BundleSuggestion) {
  const discounted = s.bundlePrice < s.price;
  return {
    slug: s.slug,
    name: s.name,
    price: s.price,
    compareAtPrice: s.compareAtPrice ?? undefined,
    image: s.image ?? null,
    ...(discounted ? { bundleKeySlug: s.keySlug, bundlePrice: s.bundlePrice } : {}),
  };
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
    previewItem,
    confirmPreview,
    isOutOfStock,
    outOfStockItems,
    effectivePrice,
    compareAtFor,
  } = useCart();
  // Explicit request: an out-of-stock item can't be added or paid for in any
  // case. Suggestions below can't be added, sold-out lines already in the
  // bag are labelled, and checkout waits until they're removed.
  const checkoutBlocked = outOfStockItems.length > 0;
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

  // Read before the early return below — a hook can't run conditionally.
  const { currency, rates } = useCurrency();

  if (!drawerOpen) return null;

  // Same conversion as the cart page and checkout — see CartClient.
  const money = (v: number) => formatPrice(v, currency, rates[currency]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close bag"
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/30"
      />
      {/* Explicit request: on lg+ screens, "Why Not Add" becomes its own
          panel to the left of the bag (matching the reference layout: two
          flush-right panels side by side), instead of only the compact
          in-drawer list below. Below lg there's no room for two panels
          side by side, so that compact list (further down) stays the only
          version there — unchanged. */}
      {suggestions.length > 0 && (
        <div className="relative hidden h-full w-[300px] shrink-0 flex-col overflow-y-auto bg-[#f7f4ef] px-6 py-6 lg:flex">
          <p className="mb-5 font-ui text-[13px] font-semibold uppercase tracking-[0.08em] text-[#2b261f]">
            Why Not Add
          </p>
          <ul className="space-y-5">
            {suggestions.map((s) => (
              <li key={s.slug} className="flex gap-3 border-b border-black/10 pb-5 last:border-b-0 last:pb-0">
                <Link
                  href={`/product/${s.slug}`}
                  onClick={closeDrawer}
                  className="relative block h-[85px] w-[85px] shrink-0 overflow-hidden bg-[#efe9e0]"
                >
                  {s.image && (
                    <Image src={s.image} alt={s.name} fill sizes="85px" className="object-cover" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[#2b261f]">{s.name}</p>
                  <p className="mt-1 text-[13px] text-[#2b261f]">
                    {money(s.bundlePrice)}
                    {s.bundleCompareAt && (
                      <span className="ml-2 text-black/40 line-through">
                        {money(s.bundleCompareAt)}
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={isOutOfStock(s.slug)}
                    onClick={() => addItem(addInputFor(s))}
                    className="mt-2 border border-[#28241f] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#28241f] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {isOutOfStock(s.slug) ? "Out of Stock" : "Add to Bag"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
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
          {previewItem && (
            <div className="mb-5 border-b border-black/10 pb-5">
              <div className="flex items-center gap-3">
                <div className="relative block h-16 w-16 shrink-0 overflow-hidden bg-[#f5f2ee]">
                  {previewItem.image && (
                    <Image
                      src={previewItem.image}
                      alt={previewItem.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#2b261f]">
                    {previewItem.name}
                  </p>
                  <p className="mt-1 text-[13px] text-[#2b261f]">
                    {money(previewItem.price)}
                    {previewItem.compareAtPrice && (
                      <span className="ml-2 text-black/40 line-through">
                        {money(previewItem.compareAtPrice)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={confirmPreview}
                disabled={isOutOfStock(previewItem.slug, previewItem.variantId)}
                className="mt-3 flex h-11 w-full items-center justify-center border border-[#28241f] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#28241f] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isOutOfStock(previewItem.slug, previewItem.variantId) ? "Out of Stock" : "Add to Bag"}
              </button>
            </div>
          )}

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
                      <p className="mt-1 text-[13px] text-[#2b261f]">
                        {money(effectivePrice(item))}
                        {compareAtFor(item) && (
                          <span className="ml-2 text-black/40 line-through">
                            {money(compareAtFor(item)!)}
                          </span>
                        )}
                      </p>
                      {isOutOfStock(item.slug, item.variantId) && (
                        <p className="mt-0.5 text-[11px] font-medium text-red-700">
                          Out of stock - please remove to check out
                        </p>
                      )}
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
                        {/* A bundle-discounted companion is capped at one
                            unit (CartProvider's BUNDLE_MAX_QTY), so this
                            would be a silent no-op — shown disabled rather
                            than looking broken. More of that product is
                            bought from its own page, arriving as a separate
                            full-price line. */}
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={!!item.bundleKeySlug}
                          title={
                            item.bundleKeySlug
                              ? "Bundle price applies to 1 item"
                              : undefined
                          }
                          onClick={() => updateQty(key, item.qty + 1)}
                          className="flex h-full items-center justify-center text-[#2b261f] hover:text-gold disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-[#2b261f]"
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

          {/* lg:hidden — at lg+ this is replaced by the standalone side
              panel to the left of the drawer (see above); this compact
              in-drawer version stays exactly as before on mobile/tablet,
              where there's no room for two side-by-side panels. */}
          {suggestions.length > 0 && (
            <div className="mt-6 lg:hidden">
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
                      <p className="text-xs text-black/50">
                        {money(s.bundlePrice)}
                        {s.bundleCompareAt && (
                          <span className="ml-1.5 line-through">{money(s.bundleCompareAt)}</span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isOutOfStock(s.slug)}
                      onClick={() => addItem(addInputFor(s))}
                      className="shrink-0 rounded-full border border-[#28241f] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#28241f] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      {isOutOfStock(s.slug) ? "Out of Stock" : "Add to Bag"}
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
            {checkoutBlocked && (
              <p role="alert" className="mb-3 text-xs text-red-700">
                Some items in your bag are out of stock. Remove them to continue.
              </p>
            )}
            <button
              type="button"
              disabled={checkoutBlocked}
              onClick={() => {
                if (checkoutBlocked) return;
                closeDrawer();
                router.push("/checkout");
              }}
              className="flex h-11 w-full items-center justify-center border border-[#111] bg-[#111] text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Secure Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
