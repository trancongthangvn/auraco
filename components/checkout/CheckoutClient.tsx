"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch, ApiError } from "@/lib/api";
import {
  ChevronLeftIcon,
  PlusIcon,
  MinusIcon,
  GlobeIcon,
} from "@/components/icons";

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

type CheckoutItem = {
  id: number;
  slug: string;
  name: string;
  material: string;
  price: number;
  images: string[];
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
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState("");

  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [paymentMethodsError, setPaymentMethodsError] = useState("");

  const subtotal = items.reduce((sum, p) => sum + p.price, 0);

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

  const shippingReady = city.trim().length > 0 && postalCode.trim().length > 0;
  const total = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<CheckoutItem[]>("/api/products");
        setItems(
          data.slice(0, 2).map((p) => ({ ...p, price: Number(p.price) }))
        );
      } catch (err) {
        setItemsError(
          err instanceof ApiError ? err.message : "Failed to load your bag"
        );
      } finally {
        setItemsLoading(false);
      }
    })();

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
          items: items.map((item) => ({ product_id: item.id, qty: 1 })),
        }),
      });
      setOrder(data);
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
      {/* Minimal checkout top bar */}
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between px-6 py-4 gap-4">
          <Link href="/" aria-label="AURA & CO" className="shrink-0">
            <Image
              src="/images/brand/logo-badge.png"
              alt="AURA & CO"
              width={44}
              height={44}
              className="h-10 w-10 sm:h-11 sm:w-11"
            />
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-sm">
            <GlobeIcon size={16} />
            USD
          </span>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-sm tracking-wide hover:text-gold transition-colors"
          >
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
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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
              <select
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
                <label className={labelClass}>First name</label>
                <input
                  required
                  className={inputClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input
                  required
                  className={inputClass}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className={labelClass}>Company (optional)</label>
              <input className={inputClass} />
            </div>
            <div className="mb-3">
              <label className={labelClass}>Address</label>
              <input
                required
                className={inputClass}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className={labelClass}>
                Apartment / suite (optional)
              </label>
              <input
                className={inputClass}
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
              />
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
              <input
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
              <p className="mb-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {paymentMethodsError}
              </p>
            )}

            {!order && (
              <div className="border border-black/20">
                {cardMethod && (
                  <>
                    <label className="flex items-center gap-3 px-4 py-3 border-b border-black/10 text-sm">
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === "card"}
                        onChange={() => setPayment("card")}
                      />
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
                      className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm tracking-wide hover:bg-black/5 transition-colors"
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
                      <div>
                        {otherMethods.map((option) => (
                          <label
                            key={option.key}
                            className="flex items-center gap-3 px-4 py-3 border-t border-black/10 text-sm"
                          >
                            <input
                              type="radio"
                              name="payment"
                              checked={payment === option.key}
                              onChange={() => setPayment(option.key)}
                            />
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
                <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                      <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
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
            ) : itemsError ? (
              <p className="text-sm text-red-700 mb-6">{itemsError}</p>
            ) : (
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="relative w-16 h-16 shrink-0 border border-black/10 bg-white">
                      {item.images[0] && (
                        <Image
                          src={item.images[0]}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{item.name}</p>
                      <p className="text-xs text-black/50">{item.material}</p>
                    </div>
                    <p className="text-sm">${item.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-6">
              <input
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
              <div className="flex justify-between text-base pt-2 border-t border-black/10 mt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
