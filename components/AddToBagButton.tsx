"use client";

import { useState } from "react";
import { BagIcon, CheckIcon } from "@/components/icons";

/**
 * Small add-to-bag control that sits on a product card's image, the way the
 * reference site's `.shop-product-card__cart-btn` does.
 *
 * The card itself is a link to the product, so the click has to be stopped
 * here or the page would navigate away instead. There is no persisted cart
 * yet — as with the product page's own button, this acknowledges the click
 * and leaves the bag itself for when that lands.
 */
export default function AddToBagButton({ productName }: { productName: string }) {
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      aria-label={`Add ${productName} to bag`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
      className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_20px_rgba(43,38,31,0.22)] transition-[opacity,box-shadow,background-color] duration-300 hover:bg-ink hover:text-white hover:shadow-[0_12px_26px_rgba(43,38,31,0.32)] sm:opacity-0 sm:group-hover:opacity-100"
    >
      {added ? <CheckIcon size={17} /> : <BagIcon size={17} />}
    </button>
  );
}
