"use client";

import { BagIcon } from "@/components/icons";
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
 *
 * Explicit request: one click adds the item straight to the bag, no
 * confirmation step. This is a deliberate departure from the reference
 * site's own behavior — auracojewelry.com opens a preview drawer requiring
 * a second click to actually add the item; that two-step flow (previously
 * matched here via `showPreview`) is no longer wanted.
 */
export default function AddToBagButton({ item }: { item: CartLineInput }) {
  const { addItem } = useCart();

  return (
    <button
      type="button"
      aria-label={`Add ${item.name} to bag`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addItem(item);
      }}
      className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/55 text-ink backdrop-blur-[2px] transition-[opacity,box-shadow,background-color,border-color] duration-300 hover:border-ink hover:bg-ink hover:text-white sm:opacity-[0.55] sm:group-hover:opacity-100"
    >
      <BagIcon size={17} />
    </button>
  );
}
