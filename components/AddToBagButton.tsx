"use client";

import { useState } from "react";
import { BagIcon, CheckIcon } from "@/components/icons";
import { useCart } from "@/components/cart/CartProvider";

type CartLineInput = {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  material?: string;
};

/**
 * Small add-to-bag control that sits on a product card's image, the way the
 * reference site's `.shop-product-card__cart-btn` does.
 *
 * The card itself is a link to the product, so the click has to be stopped
 * here or the page would navigate away instead.
 */
export default function AddToBagButton({ item }: { item: CartLineInput }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      aria-label={`Add ${item.name} to bag`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addItem(item);
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
      className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/55 text-ink backdrop-blur-[2px] transition-[opacity,box-shadow,background-color,border-color] duration-300 hover:border-ink hover:bg-ink hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
    >
      {added ? <CheckIcon size={17} /> : <BagIcon size={17} />}
    </button>
  );
}
