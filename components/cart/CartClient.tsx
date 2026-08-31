"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import { cartItemKey } from "@/lib/cart";
import {
  MinusIcon,
  PlusIcon,
  CloseIcon,
  TruckIcon,
  WarrantyBadgeIcon,
  ReturnBoxIcon,
} from "@/components/icons";

/** Bag contents, backed by the real localStorage cart (CartProvider). */
export default function CartClient({
  title,
  emptyText,
  continueText,
}: {
  title: string;
  emptyText: string;
  continueText: string;
}) {
  const { items, hydrated, totalQty, subtotal, updateQty, removeItem } =
    useCart();

  const money = (v: number) => `$${v.toFixed(2)} USD`;

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-[1100px] px-6 py-24 text-center">
        <p className="text-black/50">Loading your bag…</p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-[900px] px-6 py-24 text-center">
        <h1 className="font-serif-display text-3xl mb-4">{title}</h1>
        <p className="text-black/60 mb-8">{emptyText}</p>
        <Link
          href="/catalog"
          className="inline-block border border-[#2b261f] px-8 py-3 text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors"
        >
          {continueText}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-14">
      <h1 className="font-serif-display mb-8 text-[34px] font-normal text-[#28241f]">
        {title} ({totalQty})
      </h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_320px] lg:items-start">
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

                  <div className="mt-auto flex items-end justify-between gap-4 pt-4">
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
                    <p className="text-[15px]">{money(item.price * item.qty)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="rounded-[14px] border-[0.667px] border-[rgba(201,166,107,0.35)] bg-white p-[19.2px_18.4px] shadow-[0_8px_28px_rgba(28,24,18,0.06)]">
          <h2 className="mb-5 text-xs uppercase tracking-[0.14em] text-black/50">
            Order summary
          </h2>
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-black/60">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-5 text-base">
            <span>Total</span>
            <span className="font-medium">{money(subtotal)}</span>
          </div>

          <Link
            href="/checkout"
            className="mt-6 flex h-[44px] w-full items-center justify-center border-[0.667px] border-[#111] bg-[#111] text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85"
          >
            Secure Checkout
          </Link>
          <Link
            href="/catalog"
            className="mt-3 block text-center text-xs tracking-wide text-black/60 underline hover:text-ink"
          >
            {continueText}
          </Link>
        </aside>
      </div>

      <ul className="mt-10 grid gap-4 border-t border-black/10 pt-8 sm:grid-cols-3">
        {[
          {
            Icon: TruckIcon,
            text: "Free shipping on U.S. orders over $120, plus easy 30-day returns",
          },
          {
            Icon: WarrantyBadgeIcon,
            text: "Waterproof and tarnish-resistant, guaranteed",
          },
          { Icon: ReturnBoxIcon, text: "30-day return window on every order" },
        ].map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-3">
            <Icon size={28} className="shrink-0 text-[#a67c3d]" />
            <span className="font-ui text-[13px] leading-[1.4] text-[#403b35]">
              {text}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
