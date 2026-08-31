"use client";

import { useState } from "react";
import type { FullProduct } from "@/data/products";
import { MinusIcon, PlusIcon, CheckIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { currencyMeta } from "@/lib/currency";

/** Metal swatches parsed out of the product's own free-text `material`
 *  field (e.g. "18k Rose Gold Vermeil, Cubic Zirconia") — display-only, the
 *  way a mixed-metal single-SKU product page shows its metal(s) without a
 *  real switcher. We don't carry per-metal price/stock variants, so this
 *  never changes price, image, or availability; it only labels what the
 *  product is actually made of. */
const METAL_SWATCHES: { match: RegExp; label: string; color: string }[] = [
  { match: /rose gold/i, label: "Rose Gold", color: "#b76e79" },
  { match: /gold/i, label: "Gold", color: "#a67c3d" },
  { match: /silver/i, label: "Silver", color: "#c7c7c7" },
];

function parseMetals(material: string) {
  const found: { label: string; color: string }[] = [];
  for (const { match, label, color } of METAL_SWATCHES) {
    if (match.test(material) && !found.some((f) => f.label === label)) {
      found.push({ label, color });
    }
  }
  return found;
}

export default function AddToBag({ product }: { product: FullProduct }) {
  const dict = useDictionary().product;
  const { currency } = useCurrency();
  const symbol = currencyMeta[currency].symbol;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const metals = parseMetals(product.material);

  return (
    <div>
      <p className="sr-only">{dict.usdBase}</p>
      {/* The reference's .product-detail__price wrapper computes as 22.4px/700
          gold, but that is inherited default — the price leaf it renders is
          15px/500 Jost in near-black. Measured on the leaf, not the wrapper. */}
      <p className="flex flex-wrap items-baseline gap-[8.8px] mt-2.5 mb-6">
        {product.compareAtPrice && (
          <span className="text-[16px] leading-4 text-[#9a9a9a] line-through">
            {symbol}{product.compareAtPrice.toFixed(2)}
          </span>
        )}
        <span className="font-ui text-[15px] font-medium leading-[18px] tracking-[0.6px] text-[#302c27]">
          {symbol}{product.price.toFixed(2)}
        </span>
      </p>

      {metals.length > 0 && (
        <div className="mb-4">
          <span className="font-ui text-[11px] uppercase tracking-[0.08em] text-[#5c554a]">
            {dict.metal}: {metals.map((m) => m.label).join(", ")}
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            {metals.map((m) => (
              <span
                key={m.label}
                title={m.label}
                className="h-6 w-6 rounded-full ring-2 ring-offset-2 ring-[#2b261f]"
                style={{ backgroundColor: m.color }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="sr-only">{dict.quantity}</span>
        <div className="flex items-center border border-gold-light/35 rounded-lg h-[41px] w-[117px] justify-between px-1">
          <button
            aria-label={dict.decreaseQuantity}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-8 h-8 flex items-center justify-center hover:bg-black/5"
          >
            <MinusIcon size={14} />
          </button>
          <span className="text-center text-sm">{qty}</span>
          <button
            aria-label={dict.increaseQuantity}
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            className="w-8 h-8 flex items-center justify-center hover:bg-black/5"
          >
            <PlusIcon size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-[7.2px] mb-3">
        <button
          onClick={() => {
            setAdded(true);
            setTimeout(() => setAdded(false), 1800);
          }}
          className="w-full rounded-full border border-[#28241f] bg-white text-[#28241f] px-[21.6px] py-[10.4px] font-ui text-[13px] font-medium uppercase leading-[20.15px] tracking-[1.04px] hover:bg-black/5 transition-colors inline-flex items-center justify-center gap-2"
        >
          {added ? (
            <>
              {dict.added} <CheckIcon size={15} />
            </>
          ) : (
            dict.addToBag
          )}
        </button>
        <a
          href="/checkout"
          className="w-full text-center rounded-full bg-[#2b261f] border border-[#2b261f] text-white px-[21.6px] py-[10.4px] font-ui text-[13px] font-medium uppercase leading-[20.15px] tracking-[1.04px] hover:bg-black transition-colors"
        >
          {dict.buyNow}
        </a>
      </div>


    </div>
  );
}
