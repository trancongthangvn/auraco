"use client";

import { useState } from "react";
import Link from "next/link";
import { products } from "@/data/products";
import { ChevronLeftIcon, PlusIcon, MinusIcon, GlobeIcon } from "@/components/icons";

const countries = [
  "Vietnam",
  "United States",
  "United Kingdom",
  "Australia",
  "Canada",
  "France",
  "Germany",
  "Japan",
  "Singapore",
  "South Korea",
  "New Zealand",
  "Netherlands",
  "Ireland",
];

const paymentOptions = ["Card", "PayPal", "Cash App", "Zelle"] as const;
type PaymentOption = (typeof paymentOptions)[number];

const inputClass = "w-full border border-black/20 px-4 py-3 text-sm";
const labelClass = "block text-xs tracking-wide uppercase mb-2";

export default function CheckoutPage() {
  const items = [products[0], products[1]];
  const subtotal = items.reduce((sum, p) => sum + p.price, 0);

  const [showExpressDemo, setShowExpressDemo] = useState(false);
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [payment, setPayment] = useState<PaymentOption>("Card");
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [paidDemo, setPaidDemo] = useState(false);

  const shippingReady = city.trim().length > 0 && postalCode.trim().length > 0;

  return (
    <>
      {/* Minimal checkout top bar */}
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between px-6 py-4 gap-4">
          <Link
            href="/"
            className="font-serif-display text-2xl tracking-[0.15em] shrink-0"
          >
            AURA & CO
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-sm">
            <GlobeIcon size={16} />
            USD
          </span>
          <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm tracking-wide hover:text-gold transition-colors">
            <ChevronLeftIcon size={14} /> Back to cart
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left column: checkout form */}
        <div>
          {/* Express checkout */}
          <section className="mb-6">
            <h2 className="text-xs tracking-wide uppercase text-black/50 mb-3 text-center">
              Express checkout
            </h2>
            <button
              type="button"
              onClick={() => setShowExpressDemo(true)}
              className="w-full border border-[#003087] text-[#003087] py-3 text-sm font-semibold tracking-wide hover:bg-[#003087] hover:text-white transition-colors"
            >
              PayPal
            </button>
            {showExpressDemo && (
              <p className="mt-3 border border-black/10 bg-black/5 px-4 py-3 text-xs text-black/70">
                This is a UI demo — no payment was processed.
              </p>
            )}
          </section>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 border-t border-black/10" />
            <span className="text-xs tracking-wide uppercase text-black/40">OR</span>
            <div className="flex-1 border-t border-black/10" />
          </div>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="font-serif-display text-xl mb-4">Contact</h2>
            <div className="mb-3">
              <label className={labelClass}>Email</label>
              <input type="email" required className={inputClass} />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5" />
              Keep me updated on new arrivals and offers
            </label>
          </section>

          {/* Delivery */}
          <section className="mb-8">
            <h2 className="font-serif-display text-xl mb-4">Delivery</h2>
            <div className="mb-3">
              <label className={labelClass}>Country</label>
              <select className={inputClass} defaultValue="Vietnam">
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>First name</label>
                <input required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input required className={inputClass} />
              </div>
            </div>
            <div className="mb-3">
              <label className={labelClass}>Company (optional)</label>
              <input className={inputClass} />
            </div>
            <div className="mb-3">
              <label className={labelClass}>Address</label>
              <input required className={inputClass} />
            </div>
            <div className="mb-3">
              <label className={labelClass}>Apartment / suite (optional)</label>
              <input className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>City</label>
                <input
                  required
                  className={inputClass}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Postal code</label>
                <input
                  required
                  className={inputClass}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input required type="tel" className={inputClass} />
            </div>
          </section>

          {/* Shipping method */}
          <section className="mb-8">
            <h2 className="font-serif-display text-xl mb-4">Shipping method</h2>
            {!shippingReady ? (
              <p className="text-sm text-black/50 border border-black/10 px-4 py-3">
                Enter your shipping address to see available methods
              </p>
            ) : (
              <label className="flex items-center justify-between border border-[#2b261f] px-4 py-3 text-sm">
                <span className="flex items-center gap-3">
                  <input type="radio" name="shipping" checked readOnly />
                  Standard Shipping
                </span>
                <span>Free</span>
              </label>
            )}
          </section>

          {/* Payment */}
          <section className="mb-8">
            <h2 className="font-serif-display text-xl mb-2">Payment</h2>
            <p className="mb-4 border border-gold bg-[#a67c3d]/10 px-4 py-3 text-sm text-[#2b261f]">
              Demo checkout — no real payment is processed.
            </p>

            <div className="border border-black/20">
              <label className="flex items-center gap-3 px-4 py-3 border-b border-black/10 text-sm">
                <input
                  type="radio"
                  name="payment"
                  checked={payment === "Card"}
                  onChange={() => setPayment("Card")}
                />
                Card
              </label>

              {payment === "Card" && (
                <div className="px-4 py-4 space-y-3 bg-black/[0.02]">
                  <input
                    disabled
                    placeholder="•••• •••• •••• ••••"
                    className={`${inputClass} bg-black/5 text-black/40 cursor-not-allowed`}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      disabled
                      placeholder="MM / YY"
                      className={`${inputClass} bg-black/5 text-black/40 cursor-not-allowed`}
                    />
                    <input
                      disabled
                      placeholder="CVC"
                      className={`${inputClass} bg-black/5 text-black/40 cursor-not-allowed`}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setMoreOptionsOpen((v) => !v)}
                className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm tracking-wide hover:bg-black/5 transition-colors"
              >
                {moreOptionsOpen ? <MinusIcon size={14} /> : <PlusIcon size={14} />}
                {moreOptionsOpen ? "Fewer payment options" : "More payment options"}
              </button>

              {moreOptionsOpen && (
                <div>
                  {(["PayPal", "Cash App", "Zelle"] as const).map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-3 px-4 py-3 border-t border-black/10 text-sm"
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === option}
                        onChange={() => setPayment(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>

          <button
            type="button"
            onClick={() => setPaidDemo(true)}
            className="w-full bg-[#2b261f] text-white py-4 text-sm tracking-wide hover:bg-black transition-colors"
          >
            PAY NOW
          </button>

          {paidDemo && (
            <p className="mt-4 border border-black/10 bg-black/5 px-4 py-3 text-sm text-black/70">
              This is a UI demo — no payment was processed and no order was placed.
            </p>
          )}
        </div>

        {/* Right column: order summary */}
        <div>
          <div className="border border-black/10 p-6 lg:sticky lg:top-6">
            <h2 className="font-serif-display text-xl mb-6">Order summary</h2>

            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.slug} className="flex items-center gap-4">
                  <img
                    src={item.images[0]}
                    alt={item.name}
                    className="w-16 h-16 object-cover border border-black/10 bg-white"
                  />
                  <div className="flex-1">
                    <p className="text-sm">{item.name}</p>
                    <p className="text-xs text-black/50">{item.material}</p>
                  </div>
                  <p className="text-sm">${item.price.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-6">
              <input
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Discount code"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() =>
                  setVoucherMessage(
                    voucherCode.trim() ? "Code not recognized" : "Enter a code first"
                  )
                }
                className="border border-[#2b261f] px-6 py-3 text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors shrink-0"
              >
                Apply
              </button>
            </div>
            {voucherMessage && (
              <p className="text-xs text-black/50 -mt-4 mb-6">{voucherMessage}</p>
            )}

            <div className="space-y-2 text-sm border-t border-black/10 pt-4">
              <div className="flex justify-between">
                <span className="text-black/60">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60">Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-black/10 mt-2">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
