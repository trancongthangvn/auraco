"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import { cartItemKey } from "@/lib/cart";
import { apiFetch } from "@/lib/api";
import ProductCarousel from "@/components/ProductCarousel";
import type { Product as CarouselProduct } from "@/data/site";
import {
  MinusIcon,
  PlusIcon,
  CloseIcon,
  ShipBagIcon,
  CheckCircleIcon,
  ReturnBoxIcon,
} from "@/components/icons";

/** Bag contents, backed by the real localStorage cart (CartProvider). */
export default function CartClient({
  title,
  emptyText,
  continueText,
  bestSellers,
}: {
  title: string;
  emptyText: string;
  continueText: string;
  /** Reference shows a "Best sellers" rail below the cart, empty or not. */
  bestSellers: CarouselProduct[];
}) {
  const { items, hydrated, totalQty, subtotal, updateQty, removeItem } =
    useCart();

  // Same display-only tax line as checkout (see CheckoutClient.tsx) — the
  // reference shows it on the cart page too, and orders have no
  // tax_amount column to persist it against, so this stays purely visual.
  const [taxPercent, setTaxPercent] = useState(0);
  useEffect(() => {
    apiFetch<{ taxPercent: number | null }>("/api/content/site-settings")
      .then((s) => setTaxPercent(s.taxPercent ?? 0))
      .catch(() => {});
  }, []);
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount;

  const money = (v: number) => `$${v.toFixed(2)} USD`;

  // The reference's `.cart-page__trust` row sits right above "Best sellers"
  // in both the empty and populated states — same content either way.
  const trustBadges = (
    <ul className="mt-10 grid gap-4 border-t border-black/10 pt-8 sm:grid-cols-3">
      {[
        {
          Icon: ShipBagIcon,
          text: "Free US Shipping over $120 & 30-Day Easy Returns",
        },
        {
          Icon: CheckCircleIcon,
          text: "100% Waterproof & Tarnish-Free Guarantee",
        },
        { Icon: ReturnBoxIcon, text: "30 Days returns" },
      ].map(({ Icon, text }) => (
        <li key={text} className="flex flex-col items-center gap-3 text-center">
          <Icon size={28} className="shrink-0 text-[#2b261f]" />
          <span className="font-ui text-[12.48px] leading-[1.4] text-[#5c554a]">
            {text}
          </span>
        </li>
      ))}
    </ul>
  );

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-[1100px] px-6 py-24 text-center">
        <p className="text-black/50">Loading your bag…</p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-[1100px] px-6 py-14">
        <div className="mx-auto max-w-[900px] py-10 text-center">
          <h1 className="font-serif-display mb-4 text-[34px] font-normal text-[#28241f]">
            {title}
          </h1>
          <p className="mb-2.5 text-sm text-[#2b261f]">{emptyText}</p>
          <p className="mb-5 text-xs text-[#2b261f]">
            Have an account?{" "}
            <Link href="/login" className="underline hover:text-gold">
              Log in
            </Link>{" "}
            to check out faster.
          </p>
          <Link
            href="/catalog"
            className="block w-full border border-[#28241f] py-3 text-center text-xs uppercase tracking-[0.18em] underline underline-offset-2 transition-colors hover:bg-[#2b261f] hover:text-white"
          >
            {continueText}
          </Link>
        </div>
        {trustBadges}
        {bestSellers.length > 0 && (
          <ProductCarousel
            title="Best sellers"
            products={bestSellers}
            layout="grid"
            centerTitle
            boxCard={false}
          />
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-14">
      <h1 className="font-serif-display mb-8 text-center text-[34px] font-normal text-[#28241f]">
        {title} ({totalQty})
      </h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_320px] lg:items-start">
        <div>
          <ul className="border-t border-black/10">
            {items.map((item) => {
              const key = cartItemKey(item);
              return (
                <li key={key} className="flex gap-5 border-b border-black/10 py-6">
                  <Link
                    href={`/product/${item.slug}`}
                    className="relative block h-24 w-24 shrink-0 overflow-hidden bg-[#f5f2ee]"
                  >
                    {/* Products can be saved without images. */}
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/product/${item.slug}`}
                          className="font-ui block text-[12px] font-normal text-[#2b261f] hover:text-gold"
                        >
                          {item.name}
                        </Link>
                        {(item.variantLabel || item.material) && (
                          <p className="mt-1 text-xs text-black/50">
                            {item.variantLabel || item.material}
                          </p>
                        )}
                        {/* Price sits directly under the name, above the
                            qty stepper — matching the reference's single
                            text column, not a separate right-aligned
                            price cell. */}
                        <p className="mt-1.5 text-[15px] text-[#2b261f]">
                          {money(item.price * item.qty)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeItem(key)}
                        className="shrink-0 text-black/40 hover:text-ink"
                      >
                        <CloseIcon size={16} />
                      </button>
                    </div>

                    <div className="mt-auto pt-4">
                      <div className="flex h-[27px] w-[83px] items-center justify-between rounded-full border-[0.667px] border-[rgba(43,38,31,0.15)] px-2">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQty(key, item.qty - 1)}
                          className="flex h-full items-center justify-center text-[#2b261f] hover:text-gold"
                        >
                          <MinusIcon size={12} />
                        </button>
                        <span className="font-ui text-[16px] font-normal text-[#2b261f]">{item.qty}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQty(key, item.qty + 1)}
                          className="flex h-full items-center justify-center text-[#2b261f] hover:text-gold"
                        >
                          <PlusIcon size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Sits under the item list, not inside the summary card — the
              reference keeps this as a plain link on the left column. */}
          <Link
            href="/catalog"
            className="mt-6 inline-block text-xs uppercase tracking-wide text-[#2b261f] underline hover:text-gold"
          >
            {continueText}
          </Link>
        </div>

        <aside className="rounded-[14px] border-[0.667px] border-[rgba(201,166,107,0.35)] bg-white p-[19.2px_18.4px] shadow-[0_8px_28px_rgba(28,24,18,0.06)]">
          <h2 className="font-serif-display mb-5 text-[24px] font-normal text-[#28241f]">
            Order summary
          </h2>
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span>Shipping</span>
            <span className="font-semibold">FREE</span>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-5 text-base">
            <span>Total</span>
            <span className="font-medium">{money(total)}</span>
          </div>
          {taxAmount > 0 && (
            <p className="mt-1 text-xs text-black/50">
              Including <span className="font-semibold text-black/70">{money(taxAmount)}</span> in taxes
            </p>
          )}
          <p className="mt-1 text-xs text-black/50">
            Have a discount code? Enter it at checkout.
          </p>

          <Link
            href="/checkout"
            className="mt-6 flex h-[44px] w-full items-center justify-center border-[0.667px] border-[#111] bg-[#111] text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85"
          >
            Secure Checkout
          </Link>
          <p className="mt-3 text-center text-xs text-black/60">
            Have an account?{" "}
            <Link href="/login" className="text-[#2b261f] underline hover:text-gold">
              Log in
            </Link>{" "}
            to check out faster.{" "}
            <Link href="/register" className="text-[#2b261f] underline hover:text-gold">
              Create account
            </Link>
          </p>
        </aside>
      </div>

      {trustBadges}

      {bestSellers.length > 0 && (
        <div className="mt-4">
          <ProductCarousel
            title="Best sellers"
            products={bestSellers}
            layout="grid"
            centerTitle
            boxCard={false}
          />
        </div>
      )}
    </main>
  );
}
