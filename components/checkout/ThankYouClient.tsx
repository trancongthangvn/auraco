"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatPrice } from "@/lib/currency";
import { readLastOrder, saveLastOrder, type CreatedOrder, type LastOrder } from "./lastOrder";

/**
 * The post-purchase thank-you screen, at its own /thankyou URL (explicit
 * request — it used to be a state inside /checkout, so the address bar
 * still read /checkout after paying). Content is unchanged from that
 * in-checkout version.
 *
 * The order comes from sessionStorage, written by the checkout just before
 * navigating here (see lastOrder.ts for why not a URL parameter). The one
 * exception is a return from Airwallex's hosted payment page, which can
 * only come back with an order id in the URL; that id is looked up the same
 * way the checkout's own return handler always did.
 */
export default function ThankYouClient() {
  const { currency, rates } = useCurrency();
  const money = (v: number) => formatPrice(v, currency, rates[currency]);

  const [data, setData] = useState<LastOrder | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Read after mount: sessionStorage doesn't exist during server render.
    // Query string via window.location, never useSearchParams — this
    // codebase's standing rule (DEPLOYMENT.md), since that hook forces a
    // Suspense boundary that has shipped blank pages before.
    const returningOrderId = new URLSearchParams(window.location.search).get(
      "airwallex_order"
    );
    if (returningOrderId) {
      apiFetch<CreatedOrder>(`/api/orders/${encodeURIComponent(returningOrderId)}`)
        .then((order) => {
          const value = { order, proofUploaded: false };
          saveLastOrder(value);
          setData(value);
        })
        .catch(() => setData(readLastOrder()))
        .finally(() => setLoaded(true));
      return;
    }
    queueMicrotask(() => {
      setData(readLastOrder());
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return <main className="mx-auto min-h-[50vh] w-full max-w-[760px] px-6 pt-10 pb-16" />;
  }

  // Reached directly (bookmark, a different tab, storage cleared): there is
  // no order to show, and nothing here should imply one was just placed.
  if (!data) {
    return (
      <main className="mx-auto w-full max-w-[760px] px-6 pt-16 pb-20 text-center">
        <h1 className="font-ui text-[26px] uppercase tracking-[0.08em] text-[#28241f]">
          Thank you
        </h1>
        <p className="mt-3 font-ui text-sm text-[#4a443c]">
          We couldn&apos;t find a recent order in this browser tab. You can
          check any order&apos;s status with its order code and email.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/pages/track-order"
            className="border border-[#28241f] px-8 py-3 font-ui text-sm uppercase tracking-[0.08em] text-[#28241f] transition-colors hover:bg-[#28241f] hover:text-white"
          >
            Track your order
          </Link>
          <Link
            href="/catalog"
            className="bg-[#111] px-8 py-3 font-ui text-sm uppercase tracking-[0.08em] text-white transition-colors hover:bg-black"
          >
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  const { order, proofUploaded } = data;

  return (
    <main className="mx-auto w-full max-w-[760px] px-6 pt-10 pb-16">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-gold-light/45 bg-white px-5 py-4 font-ui text-sm text-[#28241f]">
          <span>
            Order <strong>{order.order_code}</strong>
          </span>
          <span>
            Total: <strong>{money(Number(order.total))}</strong>
          </span>
        </div>

        <div>
          <h1 className="font-ui text-[26px] uppercase tracking-[0.08em] text-[#28241f]">
            Thank you
          </h1>
          <p className="mt-2 font-ui text-sm text-[#4a443c]">
            Order <strong>{order.order_code}</strong> has been placed.
          </p>

          {proofUploaded && (
            <p className="mt-5 rounded-[4px] bg-[#f5f1ec] px-5 py-4 font-ui text-sm text-[#4a443c]">
              Your payment proof is being reviewed.
              {order.email ? (
                <>
                  {" "}
                  We will email you at <strong>{order.email}</strong> once
                  confirmed.
                </>
              ) : null}
            </p>
          )}

          {order.email && (
            <p className="mt-5 font-ui text-sm text-[#4a443c]">
              We emailed your order details to <strong>{order.email}</strong>.
            </p>
          )}
          <p className="mt-3 font-ui text-sm font-semibold text-[#28241f]">
            Total (display currency at checkout): {money(Number(order.total))}
          </p>
          <p className="mt-3 font-ui text-xs text-black/50">
            Save your order code — you can check its status any time at{" "}
            <Link href="/pages/track-order" className="text-[#2b261f] underline hover:text-gold">
              Track Your Order
            </Link>
            .
          </p>

          {order.items && order.items.length > 0 && (
            <>
              <h2 className="mt-8 font-ui text-[15px] uppercase tracking-[0.08em] text-[#28241f]">
                Your items
              </h2>
              <ul className="mt-3 divide-y divide-gold-light/45 border-y border-gold-light/45">
                {order.items.map((it) => (
                  <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-ui text-sm text-[#28241f]">
                        {it.name}
                        {it.variant_label ? ` — ${it.variant_label}` : ""}
                      </p>
                      <p className="font-ui text-sm text-black/60">
                        × {it.qty} — {money(Number(it.price))}
                      </p>
                    </div>
                    {it.product_slug && (
                      <Link
                        href={`/review?order=${encodeURIComponent(
                          order.order_code
                        )}&product=${encodeURIComponent(it.product_slug)}`}
                        className="shrink-0 font-ui text-sm underline underline-offset-4 hover:text-gold"
                      >
                        Write a review
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <Link
            href="/catalog"
            className="mt-8 flex w-full items-center justify-center bg-[#111] py-4 font-ui text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-black"
          >
            Continue shopping →
          </Link>
        </div>
      </div>
    </main>
  );
}
