"use client";

import { useState } from "react";
import type { FullProduct } from "@/data/products";
import { MinusIcon, PlusIcon, CheckIcon } from "@/components/icons";

export default function AddToBag({ product }: { product: FullProduct }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div>
      <p className="text-xs text-black/50 mb-1">USD base</p>
      <p className="text-2xl mb-6">
        {product.compareAtPrice && (
          <span className="line-through text-black/40 mr-3 text-lg">
            ${product.compareAtPrice.toFixed(2)}
          </span>
        )}
        ${product.price.toFixed(2)}
      </p>

      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm">Quantity</span>
        <div className="flex items-center border border-black/20">
          <button
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center hover:bg-black/5"
          >
            <MinusIcon size={14} />
          </button>
          <span className="w-10 text-center text-sm">{qty}</span>
          <button
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            className="w-9 h-9 flex items-center justify-center hover:bg-black/5"
          >
            <PlusIcon size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-3">
        <button
          onClick={() => {
            setAdded(true);
            setTimeout(() => setAdded(false), 1800);
          }}
          className="w-full bg-[#2b261f] text-white py-3 text-sm tracking-wide hover:bg-black transition-colors inline-flex items-center justify-center gap-2"
        >
          {added ? (
            <>
              ADDED <CheckIcon size={15} />
            </>
          ) : (
            "ADD TO BAG"
          )}
        </button>
        <a
          href="/checkout"
          className="w-full text-center border border-[#2b261f] py-3 text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors"
        >
          BUY NOW
        </a>
      </div>

      <p className="text-xs text-black/50">{product.stock} in stock</p>
    </div>
  );
}
