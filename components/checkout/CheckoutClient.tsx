"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch, ApiError } from "@/lib/api";
import { useCart } from "@/components/cart/CartProvider";
import { cartItemKey } from "@/lib/cart";
import {
  ChevronLeftIcon,
  PlusIcon,
  MinusIcon,
  GlobeIcon,
} from "@/components/icons";

/** Small brand-representative badge per payment method key — same visual
 *  language as components/PaymentIcons.tsx (the footer strip), scaled down
 *  for a list row. Falls back to a plain generic mark for anything not in
 *  this map (e.g. a future admin-added method key). */
function PaymentMethodBadge({ methodKey }: { methodKey: string }) {
  const base =
    "flex h-6 w-9 shrink-0 items-center justify-center rounded-[4px] border border-black/10 bg-white";
  switch (methodKey) {
    case "card":
      return (
        <span className={base}>
          <svg width="18" height="11" viewBox="0 0 24 14" aria-hidden="true">
            <circle cx="9" cy="7" r="6" fill="#EB001B" />
            <circle cx="15" cy="7" r="6" fill="#F79E1B" fillOpacity="0.85" />
          </svg>
        </span>
      );
    case "paypal":
      return (
        <span className={base}>
          <span className="text-[9px] font-bold italic text-[#003087]">
            Pay<span className="text-[#009cde]">Pal</span>
          </span>
        </span>
      );
    case "cashapp":
      return (
        <span className={`${base} !bg-[#00D64F]`}>
          <span className="text-sm font-bold text-white">$</span>
        </span>
      );
    case "zelle":
      return (
        <span className={`${base} !bg-[#6D1ED4]`}>
          <span className="font-serif text-sm italic text-white">Z</span>
        </span>
      );
    default:
      return (
        <span className={base}>
          <span className="text-[9px] font-semibold uppercase text-black/40">Pay</span>
        </span>
      );
  }
}

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

// Payment methods accepted by the orders API (server/routes/orders-payments.js
// PAYMENT_METHODS). The settings table may also carry 'applePay', which isn't
// a valid order payment_method, so it's filtered out below.
const ORDER_PAYMENT_KEYS = ["card", "paypal", "cashapp", "zelle"];

type ApiPaymentMethod = {
  key: string;
  label: string;
  detail: string | null;
  qr_image_url: string | null;
};

type CreatedOrder = {
  id: number;
  order_code: string;
  total: string | number;
  payment_method: string;
};

const inputClass = "w-full border border-black/20 px-4 py-3 text-sm";
const labelClass = "block text-xs tracking-wide uppercase mb-2";

export default function CheckoutClient() {
  const { items, hydrated, subtotal, clear } = useCart();
  const itemsLoading = !hydrated;

  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [paymentMethodsError, setPaymentMethodsError] = useState("");

  const [showExpressDemo, setShowExpressDemo] = useState(false);

  // Contact
  const [email, setEmail] = useState("");

  // Delivery
  const [country, setCountry] = useState("Vietnam");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");

  const [payment, setPayment] = useState("");
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [voucherApplying, setVoucherApplying] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [order, setOrder] = useState<CreatedOrder | null>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofError, setProofError] = useState("");
  const [proofUploaded, setProofUploaded] = useState(false);

  const [taxPercent, setTaxPercent] = useState(0);

  const shippingReady = city.trim().length > 0 && postalCode.trim().length > 0;
  const preTaxTotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = (preTaxTotal * taxPercent) / 100;
  const total = preTaxTotal + taxAmount;

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<ApiPaymentMethod[]>("/api/payment-methods");
        const methods = data.filter((m) => ORDER_PAYMENT_KEYS.includes(m.key));
        setPaymentMethods(methods);
        const cardFirst = methods.find((m) => m.key === "card") || methods[0];
        if (cardFirst) setPayment(cardFirst.key);
      } catch (err) {
        setPaymentMethodsError(
          err instanceof ApiError
            ? err.message
            : "Failed to load payment methods"
        );
      }
    })();
    // Tax is a display-only line here (same as Shipping, which is always
    // "Free" today) — orders has no tax_amount column, so this isn't
    // persisted server-side, only shown in the summary the customer sees
    // before placing the order.
    apiFetch<{ taxPercent: number | null }>("/api/content/site-settings")
      .then((s) => setTaxPercent(s.taxPercent ?? 0))
      .catch(() => {});
  }, []);

  const cardMethod = paymentMethods.find((m) => m.key === "card");
  const otherMethods = paymentMethods.filter((m) => m.key !== "card");
  const selectedMethod = paymentMethods.find((m) => m.key === payment);

  async function handleApplyVoucher() {
    const code = voucherCode.trim();
    if (!code) {
      setVoucherMessage("Enter a code first");
      return;
    }
    setVoucherApplying(true);
    setVoucherMessage("");
    try {
      const data = await apiFetch<{ discountAmount: number }>(
        "/api/discount-codes/validate",
        {
          method: "POST",
          body: JSON.stringify({ code, orderTotal: subtotal }),
        }
      );
      setDiscountAmount(data.discountAmount);
      setAppliedCode(code);
      setVoucherMessage(`Code applied: -$${data.discountAmount.toFixed(2)}`);
    } catch (err) {
      setDiscountAmount(0);
      setAppliedCode("");
      setVoucherMessage(
        err instanceof ApiError ? err.message : "Code not recognized"
      );
    } finally {
      setVoucherApplying(false);
    }
  }

  async function handlePayNow() {
    setSubmitError("");

    if (!email.trim()) return setSubmitError("Email is required.");
    if (!firstName.trim() || !lastName.trim())
      return setSubmitError("First and last name are required.");
    if (!address.trim()) return setSubmitError("Address is required.");
    if (!shippingReady)
      return setSubmitError("City and postal code are required.");
    if (!phone.trim()) return setSubmitError("Phone is required.");
    if (!payment) return setSubmitError("Select a payment method.");
    if (items.length === 0) return setSubmitError("Your bag is empty.");

    setSubmitting(true);
    try {
      // Most cart lines already carry the numeric product id from the page
      // that added them; any that don't (added via a product-card mapper
      // that only has the slug) get it resolved here, right before the
      // order is submitted.
      const orderItems = await Promise.all(
        items.map(async (item) => {
          const productId =
            item.productId ??
            (await apiFetch<{ id: number }>(
              `/api/products/${encodeURIComponent(item.slug)}`
            ).then((p) => p.id));
          return { product_id: productId, qty: item.qty };
        })
      );

      const data = await apiFetch<CreatedOrder>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_name: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim(),
          phone: phone.trim(),
          address: apartment.trim()
            ? `${address.trim()}, ${apartment.trim()}`
            : address.trim(),
          city: city.trim(),
          country,
          payment_method: payment,
          shipping_fee: 0,
          discount_code: appliedCode || undefined,
          items: orderItems,
        }),
      });
      setOrder(data);
      clear();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to place order"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadProof() {
    if (!order || !proofFile) return;
    setProofError("");
    setProofUploading(true);
    try {
      const formData = new FormData();
      formData.append("proof", proofFile);
      formData.append("method", order.payment_method);
      await apiFetch(`/api/orders/${order.id}/payment-proof`, {
        method: "POST",
        body: formData,
      });
      setProofUploaded(true);
    } catch (err) {
      setProofError(
        err instanceof ApiError ? err.message : "Failed to upload proof"
      );
    } finally {
      setProofUploading(false);
    }
  }

  return (
    <>
      {/* Minimal checkout top bar. Grid (auto/1fr/auto) rather than
          flex+justify-between: with only 3 children of very different
          widths, justify-between doesn't truly center the middle one — the
          same fix as the main site Header (components/Header.tsx). */}
      <header className="border-b border-black/5">
        <div className="mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4">
          <Link
            href="/"
            aria-label="AURA & CO"
            className="shrink-0 whitespace-nowrap font-serif-display text-[22px] font-normal leading-none tracking-[-0.015em] text-ink"
          >
            AURA & CO
          </Link>
          <span className="mx-auto hidden items-center gap-1.5 text-sm sm:inline-flex">
            <GlobeIcon size={16} />
            USD
          </span>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm tracking-wide hover:text-gold transition-colors"
          >
            <ChevronLeftIcon size={14} /> Back to cart
          </Link>
        </div>
      </header>

      <main className="mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
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
                This is a UI demo. No payment was processed.
              </p>
            )}
          </section>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 border-t border-black/10" />
            <span className="text-xs tracking-wide uppercase text-black/40">
              OR
            </span>
            <div className="flex-1 border-t border-black/10" />
          </div>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="font-serif-display text-xl mb-4">Contact</h2>
            <div className="mb-3">
              <label htmlFor="checkout-email" className={labelClass}>
                Email
              </label>
              <input
                id="checkout-email"
                type="email"
                required
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ink" />
              Keep me updated on new arrivals and offers
            </label>
          </section>

          {/* Delivery */}
          <section className="mb-8">
            <h2 className="font-serif-display text-xl mb-4">Delivery</h2>
            <div className="mb-3">
              <label htmlFor="checkout-country" className={labelClass}>
                Country
              </label>
              <select
                id="checkout-country"
                className={inputClass}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="checkout-first-name" className={labelClass}>
                  First name
                </label>
                <input
                  id="checkout-first-name"
                  required
                  className={inputClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="checkout-last-name" className={labelClass}>
                  Last name
                </label>
                <input
                  id="checkout-last-name"
                  required
                  className={inputClass}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor="checkout-company" className={labelClass}>
                Company (optional)
              </label>
              <input id="checkout-company" className={inputClass} />
            </div>
            <div className="mb-3">
              <label htmlFor="checkout-address" className={labelClass}>
                Address
              </label>
              <input
                id="checkout-address"
                required
                className={inputClass}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="checkout-apartment" className={labelClass}>
                Apartment / suite (optional)
              </label>
              <input
                id="checkout-apartment"
                className={inputClass}
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="checkout-city" className={labelClass}>
                  City
                </label>
                <input
                  id="checkout-city"
                  required
                  className={inputClass}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="checkout-postal-code" className={labelClass}>
                  Postal code
                </label>
                <input
                  id="checkout-postal-code"
                  required
                  className={inputClass}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="checkout-phone" className={labelClass}>
                Phone
              </label>
              <input
                id="checkout-phone"
                required
                type="tel"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </section>

          {/* Shipping method */}
          <section className="mb-8">
            <h2 className="font-serif-display text-xl mb-4">
              Shipping method
            </h2>
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

            {paymentMethodsError && (
              <p
                role="alert"
                className="mb-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {paymentMethodsError}
              </p>
            )}

            {!order && (
              <div className="divide-y divide-black/10 border border-black/20">
                {cardMethod && (
                  <>
                    <label className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-black/[0.03] transition-colors">
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === "card"}
                        onChange={() => setPayment("card")}
                      />
                      <PaymentMethodBadge methodKey="card" />
                      {cardMethod.label}
                    </label>

                    {payment === "card" && (
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
                  </>
                )}

                {otherMethods.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMoreOptionsOpen((v) => !v)}
                      className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm tracking-wide hover:bg-black/[0.03] transition-colors"
                    >
                      {moreOptionsOpen ? (
                        <MinusIcon size={14} />
                      ) : (
                        <PlusIcon size={14} />
                      )}
                      {moreOptionsOpen
                        ? "Fewer payment options"
                        : "More payment options"}
                    </button>

                    {moreOptionsOpen && (
                      <div className="divide-y divide-black/10">
                        {otherMethods.map((option) => (
                          <label
                            key={option.key}
                            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-black/[0.03] transition-colors"
                          >
                            <input
                              type="radio"
                              name="payment"
                              checked={payment === option.key}
                              onChange={() => setPayment(option.key)}
                            />
                            <PaymentMethodBadge methodKey={option.key} />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!order &&
              selectedMethod &&
              (selectedMethod.key === "cashapp" ||
                selectedMethod.key === "zelle") && (
                <div className="mt-3 border border-black/10 bg-black/5 px-4 py-3 text-sm text-black/70 space-y-2">
                  {selectedMethod.detail && <p>{selectedMethod.detail}</p>}
                  {selectedMethod.qr_image_url && (
                    <div className="relative w-32 h-32 border border-black/10 bg-white">
                      <Image
                        src={selectedMethod.qr_image_url}
                        alt={`${selectedMethod.label} QR code`}
                        fill
                        sizes="128px"
                        className="object-contain"
                      />
                    </div>
                  )}
                  <p className="text-xs text-black/50">
                    After placing your order you&apos;ll be asked to upload a
                    screenshot of your payment as proof.
                  </p>
                </div>
              )}
          </section>

          {!order && (
            <>
              <button
                type="button"
                disabled={submitting || itemsLoading}
                onClick={handlePayNow}
                className="w-full bg-[#2b261f] text-white py-4 text-sm tracking-wide hover:bg-black transition-colors disabled:opacity-50"
              >
                {submitting ? "PLACING ORDER..." : "PAY NOW"}
              </button>

              {submitError && (
                <p
                  role="alert"
                  className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {submitError}
                </p>
              )}
            </>
          )}

          {order && (
            <div className="border border-black/10 px-4 py-4 space-y-4">
              <p className="text-sm">
                Order <strong>{order.order_code}</strong> placed successfully.
                Total: ${Number(order.total).toFixed(2)}
              </p>

              {(order.payment_method === "cashapp" ||
                order.payment_method === "zelle") &&
                !proofUploaded && (
                  <div className="space-y-3">
                    <p className="text-sm text-black/70">
                      Please upload a screenshot of your{" "}
                      {order.payment_method === "cashapp"
                        ? "Cash App"
                        : "Zelle"}{" "}
                      payment as proof.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setProofFile(e.target.files?.[0] || null)
                      }
                      className="block w-full text-sm"
                    />
                    <button
                      type="button"
                      disabled={!proofFile || proofUploading}
                      onClick={handleUploadProof}
                      className="border border-[#2b261f] px-6 py-3 text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors disabled:opacity-50"
                    >
                      {proofUploading ? "UPLOADING..." : "UPLOAD PROOF"}
                    </button>
                    {proofError && (
                      <p
                        role="alert"
                        className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
                      >
                        {proofError}
                      </p>
                    )}
                  </div>
                )}

              {proofUploaded && (
                <p className="text-sm text-black/70">
                  Thank you — your payment proof was submitted and is pending
                  review.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right column: order summary */}
        <div>
          <div className="border border-black/10 p-6 lg:sticky lg:top-6">
            <h2 className="font-serif-display text-xl mb-6">
              Order summary
            </h2>

            {itemsLoading ? (
              <p className="text-sm text-black/50 mb-6">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-black/50 mb-6">Your bag is empty.</p>
            ) : (
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={cartItemKey(item)} className="flex items-center gap-4">
                    <div className="relative w-16 h-16 shrink-0 border border-black/10 bg-white">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{item.name}</p>
                      <p className="text-xs text-black/50">
                        {item.variantLabel || item.material}
                        {item.qty > 1 ? ` · Qty ${item.qty}` : ""}
                      </p>
                    </div>
                    <p className="text-sm">
                      ${(item.price * item.qty).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-6">
              <input
                aria-label="Discount code"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Discount code"
                className={inputClass}
                disabled={!!order}
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                disabled={voucherApplying || !!order}
                className="border border-[#2b261f] px-6 py-3 text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors shrink-0 disabled:opacity-50"
              >
                {voucherApplying ? "..." : "Apply"}
              </button>
            </div>
            {voucherMessage && (
              <p className="text-xs text-black/50 -mt-4 mb-6">
                {voucherMessage}
              </p>
            )}

            <div className="space-y-2 text-sm border-t border-black/10 pt-4">
              <div className="flex justify-between">
                <span className="text-black/60">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-black/60">Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-black/60">Shipping</span>
                <span>Free</span>
              </div>
              <div className="pt-2 border-t border-black/10 mt-2">
                <div className="flex justify-between text-base">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <p className="mt-1 text-xs text-black/50">
                    Including ${taxAmount.toFixed(2)} in taxes
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
