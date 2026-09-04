"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch, ApiError } from "@/lib/api";
import { useCart } from "@/components/cart/CartProvider";
import { cartItemKey } from "@/lib/cart";
import CurrencyPicker from "@/components/currency/CurrencyPicker";
import {
  ChevronLeftIcon,
  PlusIcon,
  MinusIcon,
  SearchIcon,
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

/** Floating-label text input — matches the reference checkout's
 *  `.checkout-field--floating` pattern (label sits inside the field until
 *  focused/filled, then floats to a small caption above the value). */
function FloatingField({
  id,
  label,
  type = "text",
  value,
  onChange,
  required,
  autoComplete,
  icon,
  className,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        id={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        className="peer w-full rounded-[6px] border border-[#d5d5d5] px-4 pb-2 pt-5 font-ui text-[13px] text-[#171717] outline-none focus:border-ink"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-ui text-[12px] font-light text-[#6d6d6d] transition-all peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[10px] peer-[&:not(:placeholder-shown)]:top-3 peer-[&:not(:placeholder-shown)]:translate-y-0 peer-[&:not(:placeholder-shown)]:text-[10px]"
      >
        {label}
      </label>
      {icon && (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/40">
          {icon}
        </span>
      )}
    </div>
  );
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

// Same threshold TrustBadges/cart advertise ("Free US Shipping over $120").
const FREE_SHIPPING_THRESHOLD = 120;

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

export default function CheckoutClient() {
  const { items, hydrated, subtotal, clear } = useCart();
  const itemsLoading = !hydrated;

  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [paymentMethodsError, setPaymentMethodsError] = useState("");

  const [showExpressDemo, setShowExpressDemo] = useState(false);

  // Contact
  const [email, setEmail] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(true);

  // Delivery
  const [country, setCountry] = useState("Vietnam");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);

  const [payment, setPayment] = useState("");
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(true);

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

  const freeShippingQualified = subtotal >= FREE_SHIPPING_THRESHOLD;
  const freeShippingProgress = Math.min(
    100,
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100
  );
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

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

  const sectionTitle = "font-ui text-[17px] font-medium text-[#151515] mb-4";

  return (
    <>
      {/* Free-shipping progress bar — reference's own checkout-free-shipping
          strip, shown once the cart is known (skipped pre-hydration/empty). */}
      {!itemsLoading && items.length > 0 && (
        <div className="border-b border-black/5 bg-white px-6 py-2.5">
          <div className="mx-auto h-[3px] max-w-5xl overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-ink transition-[width]"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
          <p className="mx-auto mt-1.5 max-w-5xl font-ui text-xs text-black/60">
            {freeShippingQualified ? (
              <>
                Hooray! Your order qualifies for <strong>FREE</strong> delivery.
              </>
            ) : (
              <>
                Add ${freeShippingRemaining.toFixed(2)} more for{" "}
                <strong>FREE</strong> delivery.
              </>
            )}
          </p>
        </div>
      )}

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
          <span className="mx-auto hidden md:inline-flex">
            <CurrencyPicker />
          </span>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 whitespace-nowrap font-ui text-sm tracking-wide hover:text-gold transition-colors"
          >
            <ChevronLeftIcon size={14} /> Back to cart
          </Link>
        </div>
      </header>

      <main className="mx-auto grid grid-cols-1 gap-12 px-6 py-10 lg:grid-cols-[1fr_420px]">
        {/* Left column: checkout form */}
        <div>
          {/* Express checkout */}
          <section className="mb-6">
            <h2 className="mb-3 text-center font-ui text-xs uppercase tracking-wide text-black/50">
              Express checkout
            </h2>
            <button
              type="button"
              onClick={() => setShowExpressDemo(true)}
              className="flex h-11 w-full items-center justify-center rounded-[4px] bg-[#ffc439] font-ui text-sm font-bold italic text-[#003087] transition-opacity hover:opacity-90"
            >
              Pay<span className="text-[#009cde]">Pal</span>
            </button>
            {showExpressDemo && (
              <p className="mt-3 border border-black/10 bg-black/5 px-4 py-3 font-ui text-xs text-black/70">
                This is a UI demo. No payment was processed.
              </p>
            )}
          </section>

          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 border-t border-black/10" />
            <span className="font-ui text-xs uppercase tracking-wide text-black/40">
              OR
            </span>
            <div className="flex-1 border-t border-black/10" />
          </div>

          {/* Contact */}
          <section className="mb-8">
            <h2 className={sectionTitle}>Contact</h2>
            <p className="mb-3 font-ui text-sm text-black/70">
              Have an account?{" "}
              <Link href="/login" className="underline hover:text-ink">
                Log in
              </Link>{" "}
              or{" "}
              <Link href="/register" className="underline hover:text-ink">
                create an account
              </Link>{" "}
              for faster checkout.
            </p>
            <FloatingField
              id="checkout-email"
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={setEmail}
              className="mb-3"
            />
            <label className="flex items-start gap-2 font-ui text-sm text-black/70">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-ink"
              />
              Don&apos;t miss out. Sign up for VIP access to sales, promos and
              new collections — straight to your inbox.
            </label>
          </section>

          {/* Delivery */}
          <section className="mb-8 space-y-3">
            <h2 className={sectionTitle}>Delivery</h2>
            <div className="relative">
              <select
                id="checkout-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full appearance-none rounded-[6px] border border-[#d5d5d5] px-4 pb-2 pt-5 font-ui text-[13px] text-[#171717] outline-none focus:border-ink"
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label
                htmlFor="checkout-country"
                className="pointer-events-none absolute left-4 top-3 font-ui text-[10px] font-light text-[#6d6d6d]"
              >
                Country/Region
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FloatingField
                id="checkout-first-name"
                label="First name"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={setFirstName}
              />
              <FloatingField
                id="checkout-last-name"
                label="Last name"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={setLastName}
              />
            </div>
            <FloatingField
              id="checkout-company"
              label="Company (optional)"
              autoComplete="organization"
              value={company}
              onChange={setCompany}
            />
            <FloatingField
              id="checkout-address"
              label="Address"
              required
              autoComplete="address-line1"
              value={address}
              onChange={setAddress}
              icon={<SearchIcon size={16} />}
            />
            <FloatingField
              id="checkout-apartment"
              label="Apartment, suite, etc. (optional)"
              autoComplete="address-line2"
              value={apartment}
              onChange={setApartment}
            />
            <div className="grid grid-cols-2 gap-3">
              <FloatingField
                id="checkout-city"
                label="City"
                required
                autoComplete="address-level2"
                value={city}
                onChange={setCity}
              />
              <FloatingField
                id="checkout-postal-code"
                label="Postcode"
                required
                autoComplete="postal-code"
                value={postalCode}
                onChange={setPostalCode}
              />
            </div>
            <FloatingField
              id="checkout-phone"
              label="Phone"
              required
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={setPhone}
              icon={
                <span
                  title="Used for delivery updates"
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-black/30 text-[10px] text-black/50"
                >
                  ?
                </span>
              }
            />
            <label className="flex items-start gap-2 font-ui text-sm text-black/70">
              <input
                type="checkbox"
                checked={smsOptIn}
                onChange={(e) => setSmsOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-ink"
              />
              Text me with news and offers
            </label>
          </section>

          {/* Shipping method */}
          <section className="mb-8">
            <h2 className={sectionTitle}>Shipping method</h2>
            {!shippingReady ? (
              <p className="border border-black/10 bg-black/[0.03] px-4 py-3 font-ui text-sm text-black/50">
                Enter your shipping address to view available shipping
                methods.
              </p>
            ) : (
              <label className="flex items-center justify-between border border-[#2b261f] px-4 py-3 font-ui text-sm">
                <span className="flex items-center gap-3">
                  <input type="radio" name="shipping" checked readOnly />
                  Standard Shipping
                </span>
                <span className="font-semibold uppercase">Free</span>
              </label>
            )}
          </section>

          {/* Payment */}
          <section className="mb-8">
            <h2 className={`${sectionTitle} mb-2`}>Payment</h2>
            <p className="mb-4 font-ui text-xs text-black/50">
              All transactions are secure and encrypted.
            </p>

            {paymentMethodsError && (
              <p
                role="alert"
                className="mb-4 border border-red-300 bg-red-50 px-4 py-3 font-ui text-sm text-red-700"
              >
                {paymentMethodsError}
              </p>
            )}

            {!order && (
              <div className="divide-y divide-black/10 rounded-[6px] border border-black/15">
                {cardMethod && (
                  <>
                    <label className="flex items-center gap-3 px-4 py-3 font-ui text-sm hover:bg-black/[0.03] transition-colors">
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
                      <div className="space-y-3 bg-black/[0.02] px-4 py-4">
                        <input
                          disabled
                          placeholder="•••• •••• •••• ••••"
                          className="w-full cursor-not-allowed rounded-[6px] border border-[#d5d5d5] bg-black/5 px-4 py-3 font-ui text-sm text-black/40"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            disabled
                            placeholder="MM / YY"
                            className="w-full cursor-not-allowed rounded-[6px] border border-[#d5d5d5] bg-black/5 px-4 py-3 font-ui text-sm text-black/40"
                          />
                          <input
                            disabled
                            placeholder="CVC"
                            className="w-full cursor-not-allowed rounded-[6px] border border-[#d5d5d5] bg-black/5 px-4 py-3 font-ui text-sm text-black/40"
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
                      className="flex w-full items-center gap-2 px-4 py-3 text-left font-ui text-sm tracking-wide hover:bg-black/[0.03] transition-colors"
                    >
                      {moreOptionsOpen ? (
                        <MinusIcon size={14} />
                      ) : (
                        <PlusIcon size={14} />
                      )}
                      More Payment Options
                    </button>

                    {moreOptionsOpen && (
                      <div className="divide-y divide-black/10">
                        {otherMethods.map((option) => (
                          <label
                            key={option.key}
                            className="flex items-center gap-3 px-4 py-3 font-ui text-sm hover:bg-black/[0.03] transition-colors"
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
                <div className="mt-3 space-y-2 border border-black/10 bg-black/5 px-4 py-3 font-ui text-sm text-black/70">
                  {selectedMethod.detail && <p>{selectedMethod.detail}</p>}
                  {selectedMethod.qr_image_url && (
                    <div className="relative h-32 w-32 border border-black/10 bg-white">
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
                className="w-full rounded-[4px] bg-[#2b261f] py-4 font-ui text-sm tracking-wide text-white transition-colors hover:bg-black disabled:opacity-50"
              >
                {submitting ? "PLACING ORDER..." : "PAY NOW"}
              </button>

              {submitError && (
                <p
                  role="alert"
                  className="mt-4 border border-red-300 bg-red-50 px-4 py-3 font-ui text-sm text-red-700"
                >
                  {submitError}
                </p>
              )}
            </>
          )}

          {order && (
            <div className="space-y-4 border border-black/10 px-4 py-4">
              <p className="font-ui text-sm">
                Order <strong>{order.order_code}</strong> placed successfully.
                Total: ${Number(order.total).toFixed(2)}
              </p>

              {(order.payment_method === "cashapp" ||
                order.payment_method === "zelle") &&
                !proofUploaded && (
                  <div className="space-y-3">
                    <p className="font-ui text-sm text-black/70">
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
                      className="block w-full font-ui text-sm"
                    />
                    <button
                      type="button"
                      disabled={!proofFile || proofUploading}
                      onClick={handleUploadProof}
                      className="border border-[#2b261f] px-6 py-3 font-ui text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors disabled:opacity-50"
                    >
                      {proofUploading ? "UPLOADING..." : "UPLOAD PROOF"}
                    </button>
                    {proofError && (
                      <p
                        role="alert"
                        className="border border-red-300 bg-red-50 px-4 py-3 font-ui text-sm text-red-700"
                      >
                        {proofError}
                      </p>
                    )}
                  </div>
                )}

              {proofUploaded && (
                <p className="font-ui text-sm text-black/70">
                  Thank you — your payment proof was submitted and is pending
                  review.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right column: order summary — reference's tinted aside panel
            (#f5f5f5, 38px/36px/60px padding), with the voucher field inside
            the same card below the totals, matching the reference. */}
        <div>
          <div className="rounded-[8px] bg-[#f5f5f5] px-9 pb-[38px] pt-[38px] lg:sticky lg:top-6">
            <h2 className="mb-6 font-ui text-sm font-medium text-[#171717]">
              Your order
            </h2>

            {itemsLoading ? (
              <p className="mb-6 font-ui text-sm text-black/50">Loading…</p>
            ) : items.length === 0 ? (
              <p className="mb-6 font-ui text-sm text-black/50">
                Your bag is empty.
              </p>
            ) : (
              <ul className="mb-6 space-y-4">
                {items.map((item) => (
                  <li key={cartItemKey(item)} className="flex items-start gap-4">
                    <Link
                      href={`/product/${item.slug}`}
                      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[4px] bg-white"
                    >
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/product/${item.slug}`}
                        className="font-ui text-sm text-[#171717] hover:text-gold"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 flex items-center gap-2 font-ui text-xs text-black/50">
                        <span>× {item.qty}</span>
                        <span>${(item.price * item.qty).toFixed(2)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-2 border-t border-black/10 pt-4 font-ui text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <strong>-${discountAmount.toFixed(2)}</strong>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <strong className="uppercase">Free</strong>
              </div>
              <div className="flex justify-between pt-2 text-base">
                <span>Total</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
              {taxAmount > 0 && (
                <p className="text-xs text-black/50">
                  Including ${taxAmount.toFixed(2)} in taxes
                </p>
              )}
            </div>

            {/* Voucher — inside the same order-summary card, below the
                totals, matching the reference's single combined panel. */}
            <div className="mt-6 flex gap-2">
              <div className="relative flex-1">
                <input
                  id="checkout-voucher"
                  aria-label="Voucher code"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="Voucher code"
                  disabled={!!order}
                  className="w-full rounded-[6px] border border-[#d5d5d5] bg-white px-4 py-3 font-ui text-[13px] text-[#171717] outline-none focus:border-ink disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyVoucher}
                disabled={voucherApplying || !!order}
                className="shrink-0 rounded-[6px] border border-[#d5d5d5] bg-[#e9e9e9] px-6 py-3 font-ui text-sm tracking-wide text-black/50 hover:bg-[#2b261f] hover:text-white transition-colors disabled:opacity-50"
              >
                {voucherApplying ? "..." : "Apply"}
              </button>
            </div>
            {voucherMessage && (
              <p className="mt-2 font-ui text-xs text-black/50">
                {voucherMessage}
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
