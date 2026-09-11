"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";

type OrderItem = {
  id: number;
  name: string;
  material: string | null;
  price: string | number;
  qty: number;
  image_url: string | null;
};

type LookedUpOrder = {
  order_code: string;
  status: string;
  payment_method: string;
  created_at: string;
  subtotal: string | number;
  shipping_fee: string | number;
  discount_amount: string | number;
  total: string | number;
  customer_name: string;
  city: string;
  country: string;
  items: OrderItem[];
};

const money = (v: string | number) => `$${Number(v).toFixed(2)}`;

/**
 * Contract line item 16 ("tra cứu đơn hàng theo mã") — the storefront's own
 * lookup screen. Posts to POST /api/orders/lookup, which (unlike GET
 * /api/orders/:id) requires the order's email as well as its code: the code
 * alone ('AC-1042') is short and sequential, so a code-only public lookup
 * would let anyone page through every customer's order history.
 */
export default function OrderLookupForm() {
  const [orderCode, setOrderCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<LookedUpOrder | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setOrder(null);
    apiFetch<LookedUpOrder>("/api/orders/lookup", {
      method: "POST",
      body: JSON.stringify({ orderCode: orderCode.trim(), email: email.trim() }),
    })
      .then((data) => setOrder(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again."
        );
      })
      .finally(() => setLoading(false));
  };

  const field =
    "w-full rounded-[8px] border border-[rgba(43,38,31,0.15)] bg-[#faf6ec] px-4 py-3 text-sm text-[#2b261f] placeholder:text-black/35 focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f] disabled:bg-black/[0.03]";
  const label = "block text-xs font-semibold tracking-wide uppercase mb-2 text-[#2b261f]";

  return (
    <div className="mx-auto max-w-[600px] px-6 pb-16">
      <div className="rounded-[14px] border-[0.667px] border-[rgba(201,166,107,0.35)] bg-white p-8 shadow-[0_8px_28px_rgba(28,24,18,0.06)] sm:p-10">
        <h2 className="font-serif-display mb-2 text-center text-2xl font-normal text-[#2b261f]">
          Track your order
        </h2>
        <p className="mb-8 text-center text-sm text-black/60">
          Enter the order code from your confirmation email, along with the
          email address you placed the order under.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="lookup-code" className={label}>
              Order code
            </label>
            <input
              id="lookup-code"
              required
              placeholder="e.g. AC-1042"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              disabled={loading}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="lookup-email" className={label}>
              Email
            </label>
            <input
              id="lookup-email"
              required
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className={field}
            />
          </div>

          {error && (
            <p role="alert" className="border border-red-700/30 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#2b261f] py-3.5 text-xs font-semibold tracking-[0.12em] text-[#2b261f] transition-colors hover:bg-[#2b261f] hover:text-white disabled:opacity-60"
          >
            {loading ? "LOOKING UP..." : "TRACK ORDER"}
          </button>
        </form>
      </div>

      {order && (
        <div className="mt-6 space-y-4 rounded-[14px] border-[0.667px] border-[rgba(201,166,107,0.35)] bg-white p-8 shadow-[0_8px_28px_rgba(28,24,18,0.06)] sm:p-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-ui text-sm">
              Order <strong>{order.order_code}</strong>
            </p>
            <span className="inline-flex items-center rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-[#2b261f]">
              {order.status}
            </span>
          </div>
          <p className="text-xs text-black/50">
            Placed {new Date(order.created_at).toLocaleDateString()} · Shipping
            to {order.city}, {order.country}
          </p>

          <ul className="divide-y divide-black/10 border-y border-black/10">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[6px] bg-[#f5f2ee]">
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#2b261f]">{item.name}</p>
                  <p className="text-xs text-black/50">Qty {item.qty}</p>
                </div>
                <p className="shrink-0 text-sm text-[#2b261f]">
                  {money(Number(item.price) * item.qty)}
                </p>
              </li>
            ))}
          </ul>

          <div className="space-y-1.5 font-ui text-sm">
            <div className="flex justify-between text-black/60">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-black/60">
              <span>Shipping</span>
              <span>{money(order.shipping_fee)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-black/60">
                <span>Discount</span>
                <span>-{money(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-black/10 pt-1.5 text-base font-semibold text-[#2b261f]">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
          </div>

          <p className="pt-2 text-center text-xs text-black/50">
            Questions about this order?{" "}
            <Link href="/pages/contact" className="text-[#2b261f] underline hover:text-gold">
              Contact us
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
