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
   *  bundle_discount_percent) applied to the subtotal once every companion
   *  is selected alongside the main product — the bundle deal, not any one
   *  item's own compare-at price. */
  discountPercent?: number;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(companions.map((c) => [c.slug, true]))
  );
  const [added, setAdded] = useState(false);
  const { currency } = useCurrency();
  const { addItem } = useCart();

  if (companions.length === 0) return null;

  const selectedCompanions = companions.filter((c) => checked[c.slug]);
  const allSelected = selectedCompanions.length === companions.length;
  const subtotal =
    mainProduct.price + selectedCompanions.reduce((sum, c) => sum + c.price, 0);
  const bundleDiscount =
    allSelected && discountPercent > 0 ? subtotal * (discountPercent / 100) : 0;
  const total = subtotal - bundleDiscount;
  const savings =
    selectedCompanions.reduce(
      (sum, c) => sum + (c.compareAtPrice ? c.compareAtPrice - c.price : 0),
      0
    ) + bundleDiscount;

  const rows: { item: BundleItem; locked: boolean }[] = [
    { item: { ...mainProduct }, locked: true },
    ...companions.map((c) => ({ item: c, locked: false })),
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
                  {item.compareAtPrice && (
                    <span className="text-[14.08px] leading-[21.824px] text-[#5c554a] line-through">
                      {formatPrice(item.compareAtPrice, currency)}
                    </span>
                  )}
                  <span className="font-ui text-[14px] leading-[21.7px] tracking-[0.14px] text-[#302c27]">
                    {formatPrice(item.price, currency)}
                  </span>
                </div>
              </div>
            </label>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          // The bundle discount is a deal on the combined total, not any one
          // item's own price (see the discountPercent prop note above) — so
          // each line gets scaled by the same factor on the way into the
          // cart, which is a real localStorage cart now (not a demo
          // checkmark), so the total actually charged matches what this
          // button advertised.
          const scale = subtotal > 0 ? total / subtotal : 1;
          const bundleRows = [
            { slug: mainProduct.slug, name: mainProduct.name, price: mainProduct.price, image: mainProduct.image },
            ...selectedCompanions,
          ];
          for (const item of bundleRows) {
            addItem({
              slug: item.slug,
              name: item.name,
              price: Math.round(item.price * scale * 100) / 100,
              image: item.image ?? null,
            });
          }
          setAdded(true);
          setTimeout(() => setAdded(false), 1800);
        }}
        className="mt-4 flex w-full flex-col items-center gap-1 rounded-[10px] bg-[#2b261f] px-5 py-[15.2px] font-ui text-white transition-colors hover:bg-black"
      >
        {added ? (
          <span className="flex items-center gap-2 text-[13px] font-medium uppercase leading-[20.15px] tracking-[1.04px]">
            Added <CheckIcon size={15} />
          </span>
        ) : (
          <>
            <span className="text-[13px] font-medium uppercase leading-[20.15px] tracking-[1.04px]">
              Add Both to Bag
            </span>
            <span className="flex items-center gap-2 text-[12px] font-normal text-white/75">
              <span className="font-semibold text-white">
                {currencyMeta[currency].symbol}{total.toFixed(2)}
              </span>
              {savings > 0 && <span>Save {currencyMeta[currency].symbol}{savings.toFixed(2)}</span>}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
