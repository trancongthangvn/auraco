"use client";

import { createContext, useContext, useState } from "react";
import type { ProductVariant } from "@/data/products";

type VariantContextValue = {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  setSelectedVariant: (variant: ProductVariant) => void;
};

const VariantContext = createContext<VariantContextValue | null>(null);

/**
 * Shares the selected variant between Gallery (swaps its image set) and
 * AddToBag (swaps price/stock and shows the real swatch row) — on the
 * product page's server-rendered layout they sit on opposite sides of a lot
 * of server-only content, so a Context is what keeps them in sync without
 * pulling that unrelated content into a client component.
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

  return (
    <VariantContext.Provider
      value={{ variants, selectedVariant, setSelectedVariant }}
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
