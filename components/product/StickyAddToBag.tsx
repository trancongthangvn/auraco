"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { FullProduct } from "@/data/products";
import { MinusIcon, PlusIcon, CheckIcon } from "@/components/icons";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useVariant } from "./VariantProvider";
import { currencyMeta } from "@/lib/currency";

/**
 * Fixed bottom bar. Always visible from the moment the product page loads
 * (per explicit request — no scroll-triggered reveal): it no longer waits
 * for the in-page Add to Bag button to scroll out of view. `anchorId` is
 * kept in the prop type only so the caller (product page) doesn't need to
 * change; it's unused here now that the visibility gating is gone. Its
 * quantity stepper is independent from the in-page one (confirmed on the
 * reference: `data-pd-cta-qty` is a separate input from the main
 * `data-pd-qty`, not a mirrored value).
 */
export default function StickyAddToBag({
  product,
}: {
  product: FullProduct;
  anchorId: string;
}) {
  const { currency, rates } = useCurrency();
  const symbol = currencyMeta[currency].symbol;
  const rate = rates[currency];
  const { addItem } = useCart();
  const { variants, selectedVariant } = useVariant();
  const hasVariants = variants.length > 0;

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const displayPrice = hasVariants && selectedVariant ? selectedVariant.price : product.price;
  const maxQty = hasVariants ? (selectedVariant?.stock ?? 0) : product.stock;
  const outOfStock = hasVariants ? maxQty <= 0 : product.stock <= 0;
  const image =
    (hasVariants ? selectedVariant?.frontImage : undefined) ?? product.images[0] ?? null;

  const addToCart = () => {
    addItem({
      slug: product.slug,
      name: product.name,
      material: hasVariants ? undefined : product.material,
      price: displayPrice,
      image,
      qty,
      variantId: hasVariants ? selectedVariant?.id : undefined,
      variantLabel:
        hasVariants && selectedVariant
          ? [selectedVariant.colorName, selectedVariant.size].filter(Boolean).join(" / ")
          : undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-50 translate-y-0 border-t border-gold-light/35 bg-[rgba(253,251,247,0.96)] shadow-[0_-10px_30px_rgba(43,38,31,0.12)] backdrop-blur-[12px] transition-transform duration-[350ms] ease"
    >
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        {/* flex-1, not just natural content width — matches the reference:
            this block always claims the leftover row width regardless of
            how short the product name is, which is what pushes the qty+
            button group into a narrow enough remainder to wrap at the same
            point the reference does (confirmed by measuring both at the
            same ~985px viewport: without flex-1 here, the name's own short
            content width left so much room that qty+button never wrapped,
            while the reference's left block claimed ~70% of the row no
            matter what). */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border border-gold-light/35 bg-[#f5f1ea]">
            {image && (
              <Image src={image} alt="" fill sizes="48px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-ui text-[13px] leading-[17px] text-[#28241f]">
              {product.name}
            </p>
            <p className="font-ui text-[13px] font-semibold leading-[18px] text-gold">
              {symbol}
              {(displayPrice * rate).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Always stacked — qty on top, Add to Bag below — per explicit
            request, accepting a taller bar to match this exactly rather
            than chasing the reference's own (narrower) side-by-side
            layout at some widths. */}
        <div className="flex shrink-0 flex-col items-start gap-2">
          <div className="flex h-[40.5px] w-[117px] items-center justify-between rounded-[8px] border border-gold-light/35 bg-white px-1">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center hover:bg-black/5"
            >
              <MinusIcon size={14} />
            </button>
            <span className="flex h-8 w-8 items-center justify-center border-x border-gold-light/35 text-center text-base">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty((q) => Math.min(maxQty || 10, q + 1))}
              className="flex h-8 w-8 items-center justify-center hover:bg-black/5"
            >
              <PlusIcon size={14} />
            </button>
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={addToCart}
            className="flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-full border border-[#28241f] bg-white px-6 font-ui text-[13px] font-medium uppercase tracking-[0.05em] text-[#28241f] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[180px]"
          >
            {added ? (
              <>
                Added <CheckIcon size={15} />
              </>
            ) : (
              "Add to Bag"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
