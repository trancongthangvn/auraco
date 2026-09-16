"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatPrice } from "@/lib/currency";

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
  tax_amount?: string | number;
  total: string | number;
  customer_name: string;
  city: string;
  country: string;
  items: OrderItem[];
};

// Same rule as the rest of the storefront: charged in USD, shown in the
// currency picked in the header. This page hard-coded a "$" and ignored
// that, so it was the one place the picker had no effect.

/**
 * Contract line item 16 ("tra cứu đơn hàng theo mã") — the storefront's own
 * lookup screen. Posts to POST /api/orders/lookup, which (unlike GET
 * /api/orders/:id) requires the order's email as well as its code: the code
 * alone ('AC-1042') is short and sequential, so a code-only public lookup
 * would let anyone page through every customer's order history.
 */
// orders.status stores the admin's Vietnamese labels (the schema's CHECK
// constraint), which were shown verbatim to customers on this English page —
// "Đang xử lý" (bug report). Mapped for display only; the stored values and
// the admin side are unchanged.
const STATUS_LABEL: Record<string, string> = {
  "Đang xử lý": "Processing",
  "Đã giao": "Delivered",
  "Đã hủy": "Cancelled",
};

export default function OrderLookupForm() {
  const { currency, rates } = useCurrency();
  const money = (v: string | number) => formatPrice(Number(v), currency, rates[currency]);
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

  // Same floating-label treatment as the checkout's FloatingField (see
  // components/checkout/CheckoutClient.tsx): white field, hairline border, and
  // the label sitting inside the box until the field is focused or filled.
  //
  // `placeholder=" "` on both inputs is load-bearing, not a leftover:
  // `:placeholder-shown` is what tells the label whether the field is still
  // empty. A real placeholder would keep that selector permanently false and
  // strand the label in its floated position — which is why the order-code
  // example moved to a caption under the field instead of staying a
  // placeholder. It is the one hint here a customer cannot guess.
  const fieldInput =
    "peer w-full rounded-[6px] border border-[#d5d5d5] bg-white px-4 pb-2 pt-5 font-ui text-[13px] text-[#171717] outline-none transition-colors focus:border-[#2b261f] disabled:bg-black/[0.03]";
  const fieldLabel =
    "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-ui text-[12px] font-light text-[#6d6d6d] transition-all peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[10px] peer-[&:not(:placeholder-shown)]:top-3 peer-[&:not(:placeholder-shown)]:translate-y-0 peer-[&:not(:placeholder-shown)]:text-[10px]";

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
            <div className="relative">
              <input
                id="lookup-code"
                required
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                disabled={loading}
                placeholder=" "
                className={fieldInput}
              />
              <label htmlFor="lookup-code" className={fieldLabel}>
                Order code
              </label>
            </div>
            <p className="mt-1.5 font-ui text-[11px] text-black/45">e.g. AC-1042</p>
          </div>
          <div className="relative">
            <input
              id="lookup-email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder=" "
              className={fieldInput}
            />
            <label htmlFor="lookup-email" className={fieldLabel}>
              Email
            </label>
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
              {STATUS_LABEL[order.status] ?? order.status}
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
            {Number(order.tax_amount ?? 0) > 0 && (
              <div className="flex justify-between text-black/60">
                <span>Tax</span>
                <span>{money(order.tax_amount ?? 0)}</span>
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
