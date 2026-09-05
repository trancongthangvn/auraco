"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FullProduct } from "@/data/products";
import { MinusIcon, PlusIcon, CheckIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useVariant } from "./VariantProvider";
import { currencyMeta } from "@/lib/currency";

export default function AddToBag({ product }: { product: FullProduct }) {
  const dict = useDictionary().product;
  const { currency, rates } = useCurrency();
  const symbol = currencyMeta[currency].symbol;
  const rate = rates[currency];
  const router = useRouter();
  const { addItem } = useCart();
  const { variants, selectedVariant, setSelectedVariant } = useVariant();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const hasVariants = variants.length > 0;

  // One swatch per distinct color — a color with several sizes still shows
  // once here (there's no size picker yet, so it selects that color's first
  // variant; wiring a size control is a follow-up, not this pass).
  const colorSwatches = hasVariants
    ? variants.filter(
        (v, i) => variants.findIndex((o) => o.colorName === v.colorName) === i
      )
    : [];
  // A single color isn't a real choice — showing one static swatch would
  // look like a picker with nothing to pick. Only surface this row once
  // there's an actual decision to make.
  const showSwatches = colorSwatches.length >= 2;

  const displayPrice = hasVariants && selectedVariant ? selectedVariant.price : product.price;
  const displayCompareAt = hasVariants
    ? selectedVariant?.compareAtPrice
    : product.compareAtPrice;
  const maxQty = hasVariants ? (selectedVariant?.stock ?? 0) : product.stock;
  const outOfStock = hasVariants ? maxQty <= 0 : product.stock <= 0;

  const addToCart = () => {
    addItem({
      slug: product.slug,
      name: product.name,
      material: hasVariants ? undefined : product.material,
      price: displayPrice,
      image:
        (hasVariants ? selectedVariant?.frontImage : undefined) ??
        product.images[0] ??
        null,
      qty,
      variantId: hasVariants ? selectedVariant?.id : undefined,
      variantLabel:
        hasVariants && selectedVariant
          ? [selectedVariant.colorName, selectedVariant.size]
              .filter(Boolean)
              .join(" / ")
          : undefined,
    });
  };

  return (
    <div>
      <p className="sr-only">{dict.usdBase}</p>
      {/* The reference's .product-detail__price wrapper computes as 22.4px/700
          gold, but that is inherited default — the price leaf it renders is
          15px/500 Jost in near-black. Measured on the leaf, not the wrapper. */}
      <p className="flex flex-wrap items-baseline gap-[8.8px] mt-2.5 mb-6">
        <span className="font-ui text-[15px] font-medium leading-[18px] tracking-[0.6px] text-[#302c27]">
          {symbol}{(displayPrice * rate).toFixed(2)}
        </span>
        {displayCompareAt && (
          <span className="text-[16px] leading-4 text-[#9a9a9a] line-through">
            {symbol}{(displayCompareAt * rate).toFixed(2)}
          </span>
        )}
      </p>

      {/* The product's own free-text material ("Chất liệu" in the admin) had
          nowhere to surface: the Details accordion only falls back to it when
          a product has neither attributes nor imported details HTML, which is
          almost never true in practice, so an admin would fill the field in
          and never see it again. Shown here, in the same slot the variant
          swatch row uses, and deliberately gated on `!showSwatches` — that
          row already prints "Metal: <colour>" for products that have real
          variants, and printing both would read as two competing metal rows
          on the same product. */}
      {!showSwatches && product.material && (
        <p className="mb-4 font-ui text-[13px] leading-[18px] text-[#5c554a]">
          <span className="text-[#302c27]">{dict.metal}:</span>{" "}
          {product.material}
        </p>
      )}

      {showSwatches && (
        <div className="mb-4">
          <span className="font-ui text-[11px] uppercase tracking-[0.08em] text-[#5c554a]">
            {dict.metal}: {selectedVariant?.colorName}
            {selectedVariant?.size ? ` / ${selectedVariant.size}` : ""}
          </span>
          <div className="mt-1.5 flex items-center gap-2.5">
            {colorSwatches.map((v) => {
              const active = selectedVariant?.colorName === v.colorName;
              return (
                <button
                  key={v.colorName}
                  type="button"
                  title={v.colorName}
                  aria-label={v.colorName}
                  aria-pressed={active}
                  onClick={() => setSelectedVariant(v)}
                  className={`h-6 w-6 rounded-full ring-2 ring-offset-2 transition-[transform,box-shadow] hover:scale-110 ${
                    active
                      ? "ring-[#2b261f]"
                      : "ring-transparent hover:ring-[#2b261f]/70"
                  }`}
                  style={{ backgroundColor: v.colorSwatch || "#e5e0d8" }}
                />
              );
            })}
          </div>
          {outOfStock && (
            <p className="mt-2 text-[11px] text-red-700">
              This color/size is currently out of stock.
            </p>
          )}
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
          <span className="flex h-8 w-8 items-center justify-center border-x border-gold-light/35 text-center text-base">
            {qty}
          </span>
          <button
            aria-label={dict.increaseQuantity}
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="w-8 h-8 flex items-center justify-center hover:bg-black/5"
          >
            <PlusIcon size={14} />
          </button>
        </div>
      </div>

      {/* Side by side (Add to Bag left, Buy Now right) — explicit request,
          reversing an earlier "stacked, both full-width" decision. Each
          button is a flex-1 half rather than a fixed width, so they still
          split the same total width the price/qty row above spans, at any
          viewport, without a hardcoded breakpoint. */}
      <div className="flex gap-2 mb-3">
        <button
          disabled={outOfStock}
          onClick={() => {
            addToCart();
            setAdded(true);
            setTimeout(() => setAdded(false), 1800);
          }}
          className="flex-1 min-h-[44px] rounded-full border border-[#28241f] bg-white text-[#28241f] px-3 py-2 font-ui text-[13px] font-medium uppercase leading-[20.15px] tracking-[1.04px] hover:bg-black/5 transition-colors inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {added ? (
            <>
              {dict.added} <CheckIcon size={15} />
            </>
          ) : (
            dict.addToBag
          )}
        </button>
        <button
          type="button"
          disabled={outOfStock}
          onClick={() => {
            addToCart();
            router.push("/checkout");
          }}
          className="flex-1 min-h-[44px] text-center rounded-full bg-[#2b261f] border border-[#2b261f] text-white px-3 py-2 font-ui text-[13px] font-medium uppercase leading-[20.15px] tracking-[1.04px] hover:bg-black transition-colors inline-flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          {dict.buyNow}
        </button>
      </div>


    </div>
  );
}
