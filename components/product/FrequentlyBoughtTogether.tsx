"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatPrice, currencyMeta } from "@/lib/currency";
import { useCart } from "@/components/cart/CartProvider";

type BundleItem = {
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
};

export default function FrequentlyBoughtTogether({
  mainProduct,
  companions,
  discountPercent = 0,
}: {
  mainProduct: { slug: string; name: string; price: number; image?: string };
  companions: BundleItem[];
  /** Admin-set discount (server/routes/products.js's product_bundles /
   *  bundle_discount_percent) — a flat per-companion discount off each
   *  companion's own price, matching the reference site exactly (checked
   *  directly: the main product is never discounted, and every companion
   *  shows its own struck-through original price at this same percentage
   *  regardless of which other companions are checked — not a "discount
   *  the whole subtotal, only once everything is selected" bundle deal). */
  discountPercent?: number;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(companions.map((c) => [c.slug, true]))
  );
  const [added, setAdded] = useState(false);
  const { currency, rates } = useCurrency();
  const { addItem } = useCart();

  if (companions.length === 0) return null;

  // When a real bundle discount is configured, each companion's displayed
  // price is its own price discounted by that flat percentage, with its
  // original price struck through — not the companion's own unrelated
  // `compareAtPrice` (a separate, optional sitewide sale flag). Falls back
  // to that `compareAtPrice` as-is when there's no bundle discount (the
  // auto-derived-companions case, which never carries a discountPercent).
  const displayOf = (c: BundleItem) =>
    discountPercent > 0
      ? { price: c.price * (1 - discountPercent / 100), compareAtPrice: c.price }
      : { price: c.price, compareAtPrice: c.compareAtPrice };

  const selectedCompanions = companions.filter((c) => checked[c.slug]);
  const selectedDisplays = selectedCompanions.map(displayOf);
  const total =
    mainProduct.price + selectedDisplays.reduce((sum, d) => sum + d.price, 0);
  const savings = selectedDisplays.reduce(
    (sum, d) => sum + (d.compareAtPrice ? d.compareAtPrice - d.price : 0),
    0
  );

  const rows: { item: BundleItem; locked: boolean }[] = [
    { item: { ...mainProduct }, locked: true },
    ...companions.map((c) => ({ item: { ...c, ...displayOf(c) }, locked: false })),
  ];

  return (
    <div className="mt-5 border-t border-gold-light/35 pt-5">
      <h2 className="font-serif-display text-[21px] font-bold leading-[24.15px] text-[#28241f] mb-3">
        Frequently bought together
      </h2>

      {/* Each row is its own bordered card on the reference, not a divided
          list — a 10px-radius white tile with a 10.4px grid gutter. */}
      <ul className="grid gap-[10.4px]">
        {rows.map(({ item, locked }) => (
          <li
            key={item.slug}
            className="rounded-[10px] border border-gold-light/35 bg-white"
          >
            <label
              className={`flex items-start gap-3 p-3 ${
                locked ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={locked ? true : !!checked[item.slug]}
                disabled={locked}
                onChange={(e) =>
                  setChecked((prev) => ({
                    ...prev,
                    [item.slug]: e.target.checked,
                  }))
                }
                className="h-[17.6px] w-[17.6px] shrink-0 accent-[#2b261f]"
              />
              {item.image && (
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-[#f5f1ea]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-[5.6px]">
                <Link
                  href={`/product/${item.slug}`}
                  className="font-serif-display text-[16px] leading-[19.2px] text-[#28241f] underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.name}
                </Link>
                <div className="flex flex-wrap items-baseline gap-x-[10.4px] gap-y-[6.4px]">
                  <span className="font-ui text-[14px] leading-[21.7px] tracking-[0.14px] text-[#302c27]">
                    {formatPrice(item.price, currency, rates[currency])}
                  </span>
                  {item.compareAtPrice && (
                    <span className="text-[14.08px] leading-[21.824px] text-[#5c554a] line-through">
                      {formatPrice(item.compareAtPrice, currency, rates[currency])}
                    </span>
                  )}
                </div>
              </div>
            </label>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          // Main product at full price, each selected companion at its own
          // already-discounted price (see displayOf above) — a real
          // localStorage cart now (not a demo checkmark), so the total
          // actually charged matches what this button advertised.
          addItem({
            slug: mainProduct.slug,
            name: mainProduct.name,
            price: mainProduct.price,
            image: mainProduct.image ?? null,
          });
          for (const c of selectedCompanions) {
            addItem({
              slug: c.slug,
              name: c.name,
              price: Math.round(displayOf(c).price * 100) / 100,
              image: c.image ?? null,
            });
          }
          setAdded(true);
          setTimeout(() => setAdded(false), 1800);
        }}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-[#2b261f] px-5 py-[15.2px] font-ui text-[13px] font-medium uppercase leading-[20.15px] tracking-[1.04px] text-white transition-colors hover:bg-black"
      >
        {added ? (
          <span className="flex items-center gap-2">
            Added <CheckIcon size={15} />
          </span>
        ) : (
          // Reference (auracojewelry.com) is always "Add to Cart" in one
          // line — never "Add Both to Bag", which was wrong even for the
          // 2-companion case (main + 2 companions is 3 items, not "both").
          <>
            {/* Bug found in QA: this button multiplied nothing by the
                selected currency's rate — it reused the same raw USD
                `total`/`savings` for every currency and just swapped the
                symbol, so EUR/GBP showed the USD number under a different
                sign (same class of bug AddToBag.tsx had earlier). The
                individual row prices above were already correct
                (formatPrice(..., rates[currency])) — only this summary
                button's own numbers were wrong. `addItem()` below is
                deliberately untouched: cart/checkout stays USD regardless
                of what's displayed here. */}
            <span>Add to Cart -</span>
            <span className="font-semibold">
              {currencyMeta[currency].symbol}{(total * rates[currency]).toFixed(2)}
            </span>
            {savings > 0 && (
              <span className="normal-case font-normal text-white/75">
                (Save {currencyMeta[currency].symbol}{(savings * rates[currency]).toFixed(2)})
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
