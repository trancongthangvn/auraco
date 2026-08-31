"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch, ApiError } from "@/lib/api";
import {
  MinusIcon,
  PlusIcon,
  CloseIcon,
  TruckIcon,
  WarrantyBadgeIcon,
  ReturnBoxIcon,
} from "@/components/icons";

type CartItem = {
  id: number;
  slug: string;
  name: string;
  material: string;
  price: number;
  images: string[];
  qty: number;
};

type ApiCartProduct = Omit<CartItem, "qty">;

/**
 * Bag contents. There is no persisted cart yet, so — as the checkout page
 * already does — the bag is seeded with real products from the catalog API
 * so the flow can be demonstrated end to end. Quantity edits and removals
 * live in this component only.
 */
export default function CartClient({
  title,
  emptyText,
  continueText,
}: {
  title: string;
  emptyText: string;
  continueText: string;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<ApiCartProduct[]>("/api/products");
        setItems(
          data.slice(0, 3).map((p, i) => ({
            ...p,
            price: Number(p.price),
            qty: i === 0 ? 2 : 1,
          }))
        );
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Failed to load your bag"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setQty = (id: number, next: number) =>
    setItems((list) =>
      list.map((it) => (it.id === id ? { ...it, qty: Math.max(1, next) } : it))
    );

  const remove = (id: number) =>
    setItems((list) => list.filter((it) => it.id !== id));

  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const money = (v: number) => `$${v.toFixed(2)} USD`;

  if (loading) {
    return (
      <main className="mx-auto max-w-[1100px] px-6 py-24 text-center">
        <p className="text-black/50">Loading your bag…</p>
      </main>
    );
  }

  if (error || items.length === 0) {
    return (
      <main className="mx-auto max-w-[900px] px-6 py-24 text-center">
        <h1 className="font-serif-display text-3xl mb-4">{title}</h1>
        <p className="text-black/60 mb-8">{error || emptyText}</p>
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
          {items.map((item) => (
            <li key={item.id} className="flex gap-5 border-b border-black/10 py-6">
              <Link
                href={`/product/${item.slug}`}
                className="relative block h-24 w-24 shrink-0 overflow-hidden bg-[#f5f2ee]"
              >
                {/* Products can be saved without images. */}
                {item.images[0] && (
                  <Image
                    src={item.images[0]}
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
                    <p className="mt-1 text-xs text-black/50">{item.material}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => remove(item.id)}
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
                      onClick={() => setQty(item.id, item.qty - 1)}
                      className="flex h-full items-center justify-center text-[#2b261f] hover:text-gold"
                    >
                      <MinusIcon size={12} />
                    </button>
                    <span className="font-ui text-[16px] font-normal text-[#2b261f]">{item.qty}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => setQty(item.id, item.qty + 1)}
                      className="flex h-full items-center justify-center text-[#2b261f] hover:text-gold"
                    >
                      <PlusIcon size={12} />
                    </button>
                  </div>
                  <p className="text-[15px]">{money(item.price * item.qty)}</p>
                </div>
              </div>
            </li>
          ))}
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
