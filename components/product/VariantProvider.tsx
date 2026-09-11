"use client";

import { createContext, useContext, useState } from "react";
import type { ProductVariant } from "@/data/products";

/** Where the size row lives, so a blocked add-to-bag can bring it into view. */
export const SIZE_PICKER_ID = "variant-size-picker";

type VariantContextValue = {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  setSelectedVariant: (variant: ProductVariant) => void;
  /** Picks a colour: its first variant, with any earlier size choice cleared. */
  selectColor: (variant: ProductVariant) => void;
  /** Picks an exact variant from the size row and marks the size as chosen. */
  selectSize: (variant: ProductVariant) => void;
  /** Size options for the selected colour, one per distinct size, in admin order. */
  sizeOptions: ProductVariant[];
  /** Whether the size row should highlight the selected variant as chosen. */
  sizeChosen: boolean;
  /**
   * True while the selected colour offers two or more sizes and the customer
   * hasn't picked one — adding to the bag must wait. A colour with a single
   * size (or none) never blocks: there is nothing to decide.
   */
  needsSizeChoice: boolean;
};

const VariantContext = createContext<VariantContextValue | null>(null);

/**
 * Shares the selected variant between Gallery (swaps its image set) and
 * AddToBag (swaps price/stock and shows the real swatch row) — on the
 * product page's server-rendered layout they sit on opposite sides of a lot
 * of server-only content, so a Context is what keeps them in sync without
 * pulling that unrelated content into a client component.
 *
 * The size choice lives here too, not in AddToBag, because StickyAddToBag
 * has its own add button: both must refuse to add a colour with several
 * sizes until one is picked, and both must agree on whether it has been.
 */
export default function VariantProvider({
  variants,
  children,
}: {
  variants: ProductVariant[];
  children: React.ReactNode;
}) {
  const initial = variants.find((v) => v.isDefault) ?? variants[0] ?? null;
  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariant | null>(initial);
  // Starts unchosen even though a default variant (with its own size) is
  // preselected — matching the reference, which opens on "Please select a
  // size" rather than silently committing the customer to the default size.
  const [sizeChosen, setSizeChosen] = useState(false);

  const sizeOptions = selectedVariant
    ? variants.filter(
        (v, i, all) =>
          v.colorName === selectedVariant.colorName &&
          Boolean(v.size?.trim()) &&
          all.findIndex((o) => o.colorName === v.colorName && o.size === v.size) === i
      )
    : [];

  const selectColor = (variant: ProductVariant) => {
    const firstOfColor = variants.find((v) => v.colorName === variant.colorName) ?? variant;
    setSelectedVariant(firstOfColor);
    setSizeChosen(false);
  };

  const selectSize = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setSizeChosen(true);
  };

  const needsSizeChoice = sizeOptions.length >= 2 && !sizeChosen;

  return (
    <VariantContext.Provider
      value={{
        variants,
        selectedVariant,
        setSelectedVariant,
        selectColor,
        selectSize,
        sizeOptions,
        sizeChosen: sizeChosen || sizeOptions.length === 1,
        needsSizeChoice,
      }}
    >
      {children}
    </VariantContext.Provider>
  );
}

export function useVariant(): VariantContextValue {
  const ctx = useContext(VariantContext);
  if (!ctx) {
    throw new Error("useVariant must be used within a VariantProvider");
  }
  return ctx;
}
