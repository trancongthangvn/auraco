"use client";

import { useState } from "react";
import type { FullProduct } from "@/data/products";
import { MinusIcon, PlusIcon, CheckIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";

export default function AddToBag({ product }: { product: FullProduct }) {
  const dict = useDictionary().product;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div>
      <p className="sr-only">{dict.usdBase}</p>
      <p className="text-[22px] font-bold text-gold mb-6">
        {product.compareAtPrice && (
          <span className="line-through text-black/40 mr-3 text-base font-normal">
            ${product.compareAtPrice.toFixed(2)}
          </span>
        )}
        ${product.price.toFixed(2)}
      </p>

      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="sr-only">{dict.quantity}</span>
        <div className="flex items-center border border-gold/35 rounded-lg h-[41px] w-[118px] justify-between px-1">
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

      <div className="flex flex-col gap-2.5 mb-3">
        <button
          onClick={() => {
            setAdded(true);
            setTimeout(() => setAdded(false), 1800);
          }}
          className="w-full rounded-full border border-[#2b261f] bg-white text-[#28241f] py-2.5 text-[13px] font-medium uppercase tracking-[0.08em] hover:bg-black/5 transition-colors inline-flex items-center justify-center gap-2"
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
          className="w-full text-center rounded-full bg-[#2b261f] border border-[#2b261f] text-white py-2.5 text-[13px] font-medium uppercase tracking-[0.08em] hover:bg-black transition-colors"
        >
          {dict.buyNow}
        </a>
      </div>

      <p className="text-xs text-black/50">
        {product.stock} {dict.inStock}
      </p>
    </div>
  );
}
