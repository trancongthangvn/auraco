"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FullProduct } from "@/data/products";
import { MinusIcon, PlusIcon, CheckIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useVariant, SIZE_PICKER_ID } from "./VariantProvider";
import { currencyMeta } from "@/lib/currency";

export default function AddToBag({ product }: { product: FullProduct }) {
  const dict = useDictionary().product;
  const { currency, rates } = useCurrency();
  const symbol = currencyMeta[currency].symbol;
  const rate = rates[currency];
  const router = useRouter();
  const { addItem } = useCart();
  const {
    variants,
    selectedVariant,
    selectColor,
    selectSize,
    sizeOptions,
    sizeChosen,
    needsSizeChoice,
  } = useVariant();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const hasVariants = variants.length > 0;

  // One swatch per distinct color — a color with several sizes still shows
  // once here; choosing among its sizes is the size row's job below.
  const colorSwatches = hasVariants
    ? variants.filter(
        (v, i) => variants.findIndex((o) => o.colorName === v.colorName) === i
      )
    : [];
  // Every colour the admin has set up (and left "Đang bán") appears here,
  // even when there is only one — explicit request: "admin cài đặt màu nào
  // thì ngoài trang công khai có màu đó". This replaces the earlier
  // two-or-more threshold, which hid a product's only configured colour.
  // A product with no variants at all still shows its plain material line.
  const showSwatches = colorSwatches.length >= 1;

  const displayPrice = hasVariants && selectedVariant ? selectedVariant.price : product.price;
  const displayCompareAt = hasVariants
    ? selectedVariant?.compareAtPrice
    : product.compareAtPrice;
  const maxQty = hasVariants ? (selectedVariant?.stock ?? 0) : product.stock;
  const outOfStock = hasVariants ? maxQty <= 0 : product.stock <= 0;

  // A colour with several sizes can't go in the bag until one is picked —
  // explicit request, matching the reference's "Please select a size". The
  // button stays clickable (a disabled button explains nothing); the click
  // brings the size row into view instead, where the prompt is already red.
  const blockedOnSize = () => {
    if (!needsSizeChoice) return false;
    document.getElementById(SIZE_PICKER_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  };

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
          {/* Label only: explicit request to make "Metal" heavier and a couple
              of px larger than the material value it introduces. */}
          <span className="text-[15px] font-semibold text-[#302c27]">{dict.metal}:</span>{" "}
          {product.material}
        </p>
      )}

      {/* Colour row, laid out like the reference (explicit request with a
          screenshot): the same "Metal:" label treatment as the material line
          above, the chosen colour's name beside it, and round swatches below
          with a thin ring around the selected one. */}
      {showSwatches && (
        <div className="mb-4">
          <p className="font-ui text-[13px] leading-[18px] text-[#5c554a]">
            <span className="text-[15px] font-semibold text-[#302c27]">{dict.metal}:</span>{" "}
            {selectedVariant?.colorName}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 pl-[3px]">
            {colorSwatches.map((v) => {
              const active = selectedVariant?.colorName === v.colorName;
              return (
                <button
                  key={v.colorName}
                  type="button"
                  title={v.colorName}
                  aria-label={v.colorName}
                  aria-pressed={active}
                  onClick={() => selectColor(v)}
                  className={`h-[26px] w-[26px] rounded-full border border-black/15 ring-offset-[3px] transition-[box-shadow,transform] hover:scale-105 ${
                    active ? "ring-1 ring-[#2b261f]" : "ring-0 hover:ring-1 hover:ring-[#2b261f]/40"
                  }`}
                  style={{ backgroundColor: v.colorSwatch || "#e5e0d8" }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Size row — only when the selected colour actually has sizes entered
          in the admin, so every product without sizes looks exactly as
          before. Deliberately independent of the colour row: a product can
          come in one colour and several sizes. */}
      {sizeOptions.length > 0 && (
        <div id={SIZE_PICKER_ID} className="mb-4 scroll-mt-32">
          <p className="font-ui text-[13px] leading-[18px] text-[#5c554a]">
            <span className="text-[15px] font-semibold text-[#302c27]">{dict.size}:</span>{" "}
            {needsSizeChoice ? (
              <span className="text-red-700">{dict.selectSize}</span>
            ) : (
              selectedVariant?.size
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizeOptions.map((v) => {
              const active = sizeChosen && selectedVariant?.id === v.id;
              const soldOut = v.stock <= 0;
              return (
                <button
                  key={`${v.colorName}-${v.size}`}
                  type="button"
                  aria-pressed={active}
                  aria-label={soldOut ? `${v.size} (out of stock)` : v.size ?? undefined}
                  onClick={() => selectSize(v)}
                  className={`min-h-[36px] min-w-[48px] rounded-full border px-3.5 font-ui text-[13px] leading-none transition-colors ${
                    active
                      ? "border-[#2b261f] bg-[#2b261f] text-white"
                      : "border-black/20 bg-white text-[#302c27] hover:border-[#2b261f]"
                  } ${soldOut ? "line-through opacity-50" : ""}`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasVariants && outOfStock && !needsSizeChoice && (
        <p className="-mt-2 mb-4 text-[11px] text-red-700">
          This color/size is currently out of stock.
        </p>
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
            if (blockedOnSize()) return;
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
            if (blockedOnSize()) return;
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
