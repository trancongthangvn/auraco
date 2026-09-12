"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch, ApiError } from "@/lib/api";
import { useCart } from "@/components/cart/CartProvider";
import { cartItemKey } from "@/lib/cart";
import CurrencyPicker from "@/components/currency/CurrencyPicker";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatPrice } from "@/lib/currency";
import {
  ChevronLeftIcon,
  ChevronDownIcon,
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
    case "airwallex":
      return (
        <span className={`${base} w-14`}>
          <span className="text-[8px] font-semibold uppercase tracking-wide text-black/60">
            Card/PayPal/Klarna
          </span>
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

// Contract line item 15 calls for delivery support across 20+ countries.
// The original 13 stay first and in the same order (nothing reorders an
// already-placed order's stored country), with 8 more appended after.
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
  "Italy",
  "Spain",
  "Switzerland",
  "Sweden",
  "Belgium",
  "United Arab Emirates",
  "Hong Kong",
  "Malaysia",
];

// Payment methods accepted by the orders API (server/routes/orders-payments.js
// PAYMENT_METHODS). The settings table may also carry 'applePay', which isn't
// a valid order payment_method, so it's filtered out below.
const ORDER_PAYMENT_KEYS = ["card", "paypal", "cashapp", "zelle", "airwallex"];

// Airwallex's hosted-checkout redirect helper, loaded from their CDN only
// when the shopper actually picks that payment method (see
// loadAirwallexScript/redirectToAirwallexCheckout below) — no reason to ship
// it to every visitor. Typed minimally (only the two calls this file makes)
// rather than pulling in Airwallex's own SDK types.
type AirwallexGlobal = {
  init: (options: { env: string }) => void;
  redirectToCheckout: (options: {
    intent_id: string;
    client_secret: string;
    currency: string;
    mode: "payment";
    successUrl: string;
    failUrl: string;
  }) => void;
};
declare global {
  interface Window {
    Airwallex?: AirwallexGlobal;
  }
}

const AIRWALLEX_SCRIPT_SRC = "https://checkout.airwallex.com/assets/elements.bundle.min.js";
let airwallexScriptPromise: Promise<void> | null = null;
function loadAirwallexScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Airwallex) return Promise.resolve();
  if (!airwallexScriptPromise) {
    airwallexScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = AIRWALLEX_SCRIPT_SRC;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Airwallex checkout"));
      document.head.appendChild(script);
    });
  }
  return airwallexScriptPromise;
}

// Same threshold TrustBadges/cart advertise ("Free US Shipping over $120").
const FREE_SHIPPING_THRESHOLD = 120;

type ApiPaymentMethod = {
  key: string;
  label: string;
  detail: string | null;
  qr_image_url: string | null;
};

type CreatedOrderItem = {
  id: number;
  name: string;
  material: string | null;
  price: string | number;
  qty: number;
  image_url: string | null;
  variant_label?: string | null;
  /** Joined from products (see ORDER_ITEMS_SQL server-side) so the
   *  confirmation screen can link each line to its own product page for a
   *  review. Null for a product deleted after the order was placed. */
  product_slug?: string | null;
};

type CreatedOrder = {
  id: number;
  order_code: string;
  email?: string;
  total: string | number;
  payment_method: string;
  created_at?: string;
  items?: CreatedOrderItem[];
};

export default function CheckoutClient() {
  const {
    items,
    hydrated,
    subtotal,
    clear,
    removeItem,
    isOutOfStock,
    outOfStockItems,
    refreshStock,
  } = useCart();
  const itemsLoading = !hydrated;
  // Explicit request: an out-of-stock item can't be paid for in any case.
  // Checkout re-reads stock as it opens (the bag may have been filled days
  // ago), and won't place the order while any line is sold out. The orders
  // API refuses such lines too, so this is the explanation, not the guard.
  const checkoutBlocked = outOfStockItems.length > 0;
  useEffect(() => {
    queueMicrotask(() => {
      void refreshStock();
    });
  }, [refreshStock]);

  // The header's currency picker used to change nothing on this page: every
  // figure here was hard-coded as "$" + the USD number, so switching to GBP
  // swapped the flag and left the prices alone (bug report: "đổi giá tiền
  // tệ nhưng giá trị k thay đổi"). Prices are still stored and charged in
  // USD — only the display converts, and formatPrice prints the currency
  // code alongside the number so it is never ambiguous which one is shown.
  const { currency, rates } = useCurrency();
  const money = (v: number) => formatPrice(v, currency, rates[currency]);

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
  // Mobile-only collapse for the "Your order" summary card — explicit
  // request. Desktop ignores this entirely (forced open via lg: below),
  // matching its own always-expanded sticky sidebar.
  // Defaults to CLOSED on mobile — bug found while fixing the card's
  // positioning (sticky → fixed, see its own comment): once the card is
  // truly pinned to the viewport at all times instead of only appearing
  // once scrolled to the page's end, starting it pre-expanded meant a
  // multi-item cart's full card could be taller than the screen itself,
  // completely covering the checkout form underneath from the moment the
  // page loads. Starting collapsed (the compact "Order summary  $X" row)
  // avoids that; desktop is unaffected either way since lg: forces it
  // open regardless of this value.
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [voucherApplying, setVoucherApplying] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [order, setOrder] = useState<CreatedOrder | null>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  // Object URL for the chosen screenshot, so the customer can see what they
  // are about to submit (the reference design shows a thumbnail under the
  // drop zone). Revoked whenever it's replaced — see the effect below.
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofDragging, setProofDragging] = useState(false);
  const [proofReference, setProofReference] = useState("");
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

  // Returning from Airwallex's hosted checkout (see handlePayNow's
  // redirectToCheckout successUrl/failUrl below) — the cart was already
  // cleared before that redirect, so re-fetch the order by id from the URL
  // to show the same confirmation view a manual-method order gets, instead
  // of an empty checkout form. Reads the query string via window.location
  // directly rather than next/navigation's useSearchParams — this
  // codebase's standing rule (see DEPLOYMENT.md) is to never use that hook,
  // since it forces a <Suspense> boundary that has shipped blank pages to
  // production before.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const returningOrderId = params.get("airwallex_order");
    if (!returningOrderId) return;
    (async () => {
      try {
        const data = await apiFetch<CreatedOrder>(`/api/orders/${returningOrderId}`);
        setOrder(data);
      } catch {
        // Order lookup page remains available if this fails for any reason.
      }
    })();
  }, []);

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

  // Post-order state. Cash App and Zelle are the manual-confirmation
  // methods (the customer transfers outside the site, then proves it), so
  // they — and only they — get the QR screen; every other method is done
  // the moment the order exists. The settings row is looked up by the
  // ORDER's own method rather than `selectedMethod`, which follows the
  // radio group and would be wrong if the customer's selection changed
  // after the order was written.
  const orderMethod = order
    ? paymentMethods.find((m) => m.key === order.payment_method)
    : undefined;
  const payMethodLabel = orderMethod?.label ?? order?.payment_method ?? "";
  const payMethodQr = orderMethod?.qr_image_url ?? null;
  const payMethodDetail = orderMethod?.detail ?? "";
  const awaitingProof =
    !!order &&
    (order.payment_method === "cashapp" || order.payment_method === "zelle") &&
    !proofUploaded;

  // The preview is an object: URL owned by this component — release it when
  // the component unmounts, since the browser keeps the file alive for the
  // lifetime of the document otherwise.
  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

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
      setVoucherMessage(`Code applied: -${money(data.discountAmount)}`);
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
    if (checkoutBlocked)
      return setSubmitError(
        "Some items in your bag are out of stock. Remove them to place your order."
      );

    setSubmitting(true);
    // Tracked outside the try's own scope (not the `order` state, which
    // wouldn't have committed yet inside this same closure) so the catch
    // block below can tell "order created, Airwallex redirect failed" apart
    // from "order creation itself failed".
    let createdOrder: CreatedOrder | null = null;
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
          // variant_id lets the orders API judge that exact variant's
          // stock rather than the product's combined total.
          return {
            product_id: productId,
            qty: item.qty,
            ...(item.variantId != null ? { variant_id: item.variantId } : {}),
          };
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
      createdOrder = data;
      setOrder(data);
      clear();

      // Airwallex is a real gateway redirect, unlike the other methods
      // (card/paypal/cashapp/zelle here are all manual-confirmation today,
      // see orders-payments.js) — the order already exists at this point,
      // so a failure past here is surfaced as an inline error rather than
      // losing the order or double-submitting it.
      if (payment === "airwallex") {
        const intent = await apiFetch<{
          intent_id: string;
          client_secret: string;
          currency: string;
        }>(`/api/orders/${data.id}/airwallex-intent`, { method: "POST" });
        await loadAirwallexScript();
        const Airwallex = window.Airwallex;
        if (!Airwallex) throw new Error("Airwallex checkout failed to load");
        Airwallex.init({
          env: process.env.NEXT_PUBLIC_AIRWALLEX_ENV || "demo",
        });
        Airwallex.redirectToCheckout({
          intent_id: intent.intent_id,
          client_secret: intent.client_secret,
          currency: intent.currency,
          mode: "payment",
          successUrl: `${window.location.origin}/checkout?airwallex_order=${data.id}&airwallex_status=success`,
          failUrl: `${window.location.origin}/checkout?airwallex_order=${data.id}&airwallex_status=failed`,
        });
        return; // navigating away to Airwallex's hosted page
      }
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : createdOrder
            ? "Đơn hàng đã được tạo, nhưng không thể mở trang thanh toán Airwallex. Vui lòng liên hệ hỗ trợ với mã đơn hàng của bạn."
            : "Failed to place order"
      );
      // Stock ran out between opening checkout and paying: re-read it so the
      // sold-out line is labelled below, not just named in the error.
      if (err instanceof ApiError && err.status === 409) void refreshStock();
    } finally {
      setSubmitting(false);
    }
  }

  /** Accepts a screenshot from either the file picker or a drag-and-drop,
   *  converting an iPhone HEIC first. The server's upload whitelist
   *  deliberately excludes HEIC (no browser outside Safari can render it,
   *  and this container's sharp has no HEVC decoder — see
   *  server/lib/upload.js), so an iPhone screenshot used to be rejected
   *  with "Unsupported file type: application/octet-stream" — the very
   *  failure behind this bug report. Same conversion the admin's
   *  ImageField already does, loaded on demand because heic2any pulls a
   *  ~2MB wasm decoder that only a HEIC drop ever needs. */
  async function acceptProofFile(file: File | null | undefined) {
    if (!file) return;
    setProofError("");
    let usable = file;
    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      /\.(heic|heif)$/i.test(file.name);
    if (isHeic) {
      try {
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        usable = new File([blob], file.name.replace(/\.(heic|heif)$/i, "") + ".jpg", {
          type: "image/jpeg",
        });
      } catch {
        setProofError(
          "Could not read this iPhone photo (HEIC). Please take a screenshot or save it as JPG and try again."
        );
        return;
      }
    } else if (!usable.type.startsWith("image/")) {
      setProofError("Please choose an image file (JPG, PNG, WEBP, GIF or AVIF).");
      return;
    }
    setProofFile(usable);
    setProofPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(usable);
    });
  }

  async function handleUploadProof() {
    if (!order || !proofFile) return;
    setProofError("");
    setProofUploading(true);
    try {
      const formData = new FormData();
      formData.append("proof", proofFile);
      formData.append("method", order.payment_method);
      if (proofReference.trim()) {
        formData.append("reference_code", proofReference.trim());
      }
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
    // pt-[env(safe-area-inset-top)]: the checkout route now opts into
    // viewport-fit=cover (see checkout/page.tsx's own viewport export) so
    // the voucher-field safe-area padding below actually has a real inset
    // value to read — but that same opt-in also stops the browser from
    // automatically keeping page content clear of the status bar/notch at
    // the TOP of the screen, which it did for free before. Without this,
    // the header above would render partly under the notch on an iPhone.
    // env() is 0 on any device without one, so this is a no-op elsewhere.
    <div>
      {/* Free-shipping bar + top bar, pinned together — explicit request:
          both used to scroll away with the page like any other content;
          now they stay fixed at the top while the form/order-summary below
          scrolls underneath them, the same way the order-summary card
          (further down) is already pinned to the bottom. One shared
          sticky wrapper, not two independently-sticky elements, so they
          stack in a fixed order instead of both racing for the same
          top: 0 spot. bg-white so scrolled content doesn't show through
          underneath; z-40 keeps it above the page but still below the
          order-summary's own z-30 only where they'd never actually
          overlap (top vs. bottom of the same scroll), and below the
          lightbox/portal's z-[300] would-be values elsewhere in the app. */}
      <div className="sticky top-0 z-40 bg-white pt-[env(safe-area-inset-top)]">
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
                  Add {money(freeShippingRemaining)} more for{" "}
                  <strong>FREE</strong> delivery.
                </>
              )}
            </p>
          </div>
        )}

      {/* Minimal checkout top bar. Explicit request: the logo sits flush at
          the frame's own top-left corner (grid-cols-[auto_1fr] — a single
          flexible column absorbs all the remaining width, so the logo
          never gets pushed toward center the way a 3-column auto/1fr/auto
          split could), and the currency picker + "Back to cart" are
          grouped together as one right-aligned unit with a 5pt gap between
          them, instead of the currency picker sitting alone in its own
          centered middle column.
          max-w-[1280px] mx-auto: explicit follow-up request — the previous
          fix (making <main> below w-full) satisfied "the header should
          line up with the form/order-summary edges" by stretching the
          CONTENT out to match the header's own edge-to-edge span, but the
          actual reference wanted the opposite: both should share ONE
          narrower, centered column with visible margin on both sides, not
          run flush to the true viewport edge. Same max-width applied to
          <main> below, so the two stay aligned with each other exactly as
          before, just at this narrower shared width instead of full
          width. */}
      <header className="border-b border-black/5">
        <div className="mx-auto grid max-w-[1280px] grid-cols-[auto_1fr] items-center gap-4 px-6 py-4">
          <Link
            href="/"
            aria-label="AURA & CO"
            className="shrink-0 whitespace-nowrap font-serif-display text-[22px] font-normal leading-none tracking-[-0.015em] text-ink"
          >
            AURA & CO
          </Link>
          <div className="flex items-center justify-end gap-[5px]">
            <span className="hidden md:inline-flex">
              <CurrencyPicker />
            </span>
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 whitespace-nowrap font-ui text-sm tracking-wide hover:text-gold transition-colors"
            >
              <ChevronLeftIcon size={14} /> Back to cart
            </Link>
          </div>
        </div>
      </header>
      </div>

      {/* w-full is required alongside max-w-[1280px] mx-auto: as a grid
          item inside <body>'s flex-direction:column layout (app/layout.tsx),
          an auto margin (mx-auto) makes a flex child absorb free space
          instead of stretching to fill the cross axis, so without w-full
          this grid shrinks to its own content width (measured live: 1118px
          in a 1600px viewport, not the intended 1280px) and no longer lines
          up with the header's inner div above, which doesn't have this
          problem because it's a block child of <header>, not a direct flex
          child of <body>. w-full forces 100% width first, then max-w caps
          it at 1280px and mx-auto centers it — matching the header exactly. */}
      {/* pb-[130px], not the shared py-10, on mobile: the order-summary
          card below switched from position:sticky to position:fixed (see
          its own comment) — a fixed element is removed from normal flow
          entirely, so without this the page's own content (the Pay Now
          button in particular) would end up hidden underneath the now-
          floating card once scrolled to the end. 130px roughly matches the
          card's own collapsed height (pt-38 + pb-38 + one text row +
          safe-area) with some breathing room; lg: restores the original
          value since desktop's card isn't fixed. */}
      {/* Once the order exists the summary aside is gone (there is nothing
          left to edit or apply a voucher to) and the confirmation flow gets
          one narrow centred column, matching the reference's dedicated
          payment / thank-you screens. pb-[130px] also drops away with the
          fixed mobile summary card it was reserving room for. */}
      <main
        className={
          order
            ? "mx-auto w-full max-w-[760px] px-6 pt-10 pb-16"
            : "mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-12 px-6 pt-10 pb-[130px] lg:grid-cols-[1fr_420px] lg:pb-10"
        }
      >
        {/* Left column: checkout form */}
        <div>
          {/* Once the order exists the form is gone, not just disabled:
              the reference flow moves to a dedicated payment screen and
              then a thank-you screen, and leaving an editable shipping
              form on screen after the order is written would invite edits
              that change nothing. */}
          {!order && (
            <>
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
              {checkoutBlocked && (
                <p role="alert" className="mb-3 font-ui text-sm text-red-700">
                  Some items in your bag are out of stock. Remove them to place
                  your order.
                </p>
              )}
              <button
                type="button"
                disabled={submitting || itemsLoading || checkoutBlocked}
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
            </>
          )}

          {/* Post-order flow, replacing the checkout form above. Two
              screens, matching the reference design: a QR payment screen
              for the manual-confirmation methods (Cash App / Zelle) while
              their proof is still outstanding, then the thank-you screen —
              which every other payment method reaches immediately, since
              nothing further is asked of the customer there. */}
          {order && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-gold-light/45 bg-white px-5 py-4 font-ui text-sm text-[#28241f]">
                <span>
                  Order <strong>{order.order_code}</strong>
                </span>
                <span>
                  Total: <strong>{money(Number(order.total))}</strong>
                </span>
              </div>

              {awaitingProof ? (
                <div className="rounded-[10px] border border-gold-light/45 bg-white px-5 py-6 sm:px-7">
                  <h2 className="font-serif-display text-[26px] leading-tight text-[#28241f]">
                    Pay with {payMethodLabel}
                  </h2>
                  <ul className="mt-4 list-disc space-y-1.5 pl-5 font-ui text-sm text-[#4a443c]">
                    <li>
                      Scan the QR code below in {payMethodLabel} (or use the pay
                      link).
                    </li>
                    <li>
                      Send exactly{" "}
                      <strong>USD {Number(order.total).toFixed(2)}</strong>
                      {currency !== "USD" && (
                        <> ({money(Number(order.total))} at today&apos;s display rate)</>
                      )}
                      .
                    </li>
                    <li>Upload a screenshot of the completed payment below.</li>
                  </ul>

                  {/* The QR image is whatever the admin uploaded for this
                      method (/admin/payments → Cấu hình phương thức). Until
                      one is set there is nothing to scan, so the written
                      handle/email from the same settings row is shown on its
                      own instead of an empty frame. */}
                  {payMethodQr ? (
                    <div className="mt-5 flex justify-center rounded-[8px] bg-[#f7f1e8] px-4 py-6">
                      <div className="relative h-[220px] w-[220px] bg-white p-2">
                        <Image
                          src={payMethodQr}
                          alt={`${payMethodLabel} QR code`}
                          fill
                          sizes="220px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-5 rounded-[8px] bg-[#f7f1e8] px-4 py-4 text-center font-ui text-sm text-[#4a443c]">
                      {payMethodDetail ||
                        "Payment details will be emailed to you shortly."}
                    </p>
                  )}
                  {payMethodQr && payMethodDetail && (
                    <p className="mt-3 text-center font-ui text-sm text-[#4a443c]">
                      {payMethodDetail}
                    </p>
                  )}

                  <hr className="my-6 border-gold-light/40" />

                  <h3 className="font-ui text-[16px] font-semibold text-[#28241f]">
                    Upload payment proof
                  </h3>
                  <p className="mt-1 font-ui text-sm text-[#6b655c]">
                    Take a screenshot showing the completed transfer (amount,
                    recipient, and date).
                  </p>

                  <p className="mt-5 font-ui text-sm font-semibold text-[#28241f]">
                    Transfer screenshot <span className="text-[#b4482f]">*</span>
                  </p>

                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setProofDragging(true);
                    }}
                    onDragLeave={() => setProofDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setProofDragging(false);
                      void acceptProofFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`mt-2 block cursor-pointer rounded-[8px] border border-dashed px-4 py-6 text-center transition-colors ${
                      proofDragging
                        ? "border-[#8a7a5c] bg-[#f2e9db]"
                        : "border-gold-light/70 bg-[#faf6f0] hover:bg-[#f5efe5]"
                    }`}
                  >
                    <span className="block font-ui text-sm font-semibold text-[#28241f]">
                      Drop screenshot here
                    </span>
                    <span className="mt-1 block font-ui text-xs text-[#6b655c]">
                      or click to upload / take photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => void acceptProofFile(e.target.files?.[0])}
                    />
                  </label>

                  {proofPreview && (
                    <div className="mt-4 flex items-start gap-4">
                      {/* Plain <img>, not next/image: this is a local
                          object: URL for a file that never leaves the
                          browser until submit, which the image optimizer
                          can't fetch. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofPreview}
                        alt="Payment screenshot preview"
                        className="h-[150px] w-[150px] rounded-[8px] border border-gold-light/45 bg-[#faf6f0] object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview((prev) => {
                            if (prev) URL.revokeObjectURL(prev);
                            return null;
                          });
                        }}
                        className="font-ui text-xs underline underline-offset-4 hover:text-gold"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <label
                    htmlFor="proof-reference"
                    className="mt-5 block font-ui text-sm text-[#28241f]"
                  >
                    Reference / transaction ID (optional)
                  </label>
                  <input
                    id="proof-reference"
                    value={proofReference}
                    onChange={(e) => setProofReference(e.target.value)}
                    maxLength={120}
                    placeholder="e.g. last 4 digits or confirmation #"
                    className="mt-2 w-full rounded-[8px] border border-gold-light/60 bg-white px-4 py-3 font-ui text-sm text-[#28241f] outline-none placeholder:text-[#a9a196] focus:border-[#8a7a5c]"
                  />

                  <button
                    type="button"
                    disabled={!proofFile || proofUploading}
                    onClick={handleUploadProof}
                    className="mt-6 w-full rounded-full border border-[#28241f] py-4 font-ui text-sm uppercase tracking-[0.08em] text-[#28241f] transition-colors hover:bg-[#28241f] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#28241f]"
                  >
                    {proofUploading ? "SUBMITTING..." : "SUBMIT PAYMENT PROOF"}
                  </button>

                  {proofError && (
                    <p
                      role="alert"
                      className="mt-4 border border-red-300 bg-red-50 px-4 py-3 font-ui text-sm text-red-700"
                    >
                      {proofError}
                    </p>
                  )}
                </div>
              ) : (
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
                          We will email you at <strong>{order.email}</strong>{" "}
                          once confirmed.
                        </>
                      ) : null}
                    </p>
                  )}

                  {order.email && (
                    <p className="mt-5 font-ui text-sm text-[#4a443c]">
                      We emailed your order details to{" "}
                      <strong>{order.email}</strong>.
                    </p>
                  )}
                  <p className="mt-3 font-ui text-sm font-semibold text-[#28241f]">
                    Total (display currency at checkout):{" "}
                    {money(Number(order.total))}
                  </p>
                  <p className="mt-3 font-ui text-xs text-black/50">
                    Save your order code — you can check its status any time at{" "}
                    <Link
                      href="/pages/track-order"
                      className="text-[#2b261f] underline hover:text-gold"
                    >
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
                          <li
                            key={it.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-4"
                          >
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
              )}
            </div>
          )}
        </div>

        {/* Right column: order summary — reference's tinted aside panel
            (#f5f5f5, 38px/36px/60px padding), with the voucher field inside
            the same card below the totals, matching the reference. */}
        {!order && (
        <div>
          {/* fixed bottom-0 on mobile, not sticky — bug report: with
              position:sticky, this card only ever appears once the page
              has scrolled all the way down to where it naturally sits in
              flow (it's the last block on the page, with nothing below it
              to give a sticky element room to "hover" over while
              scrolling past) — it was never actually floating over the
              long form above it the way the header floats over content
              below it. position:fixed pins it to the real viewport bottom
              at all times regardless of scroll position, which is what
              "đi theo cùng khi trượt lên/xuống" actually needs. inset-x-0
              replaces the width a fixed element would otherwise lose by
              leaving normal flow. <main>'s own pb-[130px] (see its
              comment) reserves clearance so this floating card doesn't
              cover the last of the form's content. Desktop is unchanged
              (lg:sticky lg:top-6, its own pre-existing, working
              behavior — the card there sits in a two-column layout with
              real content beside it, where sticky's own "room to hover"
              requirement is actually met).
              pb-[calc(38px+env(safe-area-inset-bottom))]: bug report — with
              the card's bottom edge now flush against the true viewport
              bottom (bottom-0), the voucher field at the bottom of the card
              sat right under an iPhone's home-indicator gesture bar, which
              visually overlaps that unsafe area. env(safe-area-inset-bottom)
              is 0 on devices without one, so this only adds padding where
              actually needed. lg: keeps the original fixed 38px — the
              desktop card isn't pinned to the bottom edge at all
              (lg:bottom-auto), so it never had this problem. */}
          <div className="fixed inset-x-0 bottom-0 z-30 rounded-[8px] bg-[#f5f5f5] px-9 pb-[calc(38px+env(safe-area-inset-bottom))] pt-[38px] lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-6 lg:pb-[38px]">
            {/* Mobile-only collapsible header — explicit request. The
                button itself is inert on desktop (lg:pointer-events-none),
                where the card stays permanently expanded like before; the
                content panel below is force-opened at lg: regardless of
                `orderSummaryOpen` via the grid-rows override. Collapsed
                label/total match the reference's own "Order summary ⌄ ...
                £X" compact row. */}
            <button
              type="button"
              onClick={() => setOrderSummaryOpen((o) => !o)}
              aria-expanded={orderSummaryOpen}
              className="flex w-full items-center justify-between lg:pointer-events-none lg:cursor-default"
            >
              <span className="flex items-center gap-1.5 font-ui text-sm font-medium text-[#171717]">
                {orderSummaryOpen ? "Your order" : "Order summary"}
                <ChevronDownIcon
                  size={14}
                  className={`transition-transform lg:hidden ${orderSummaryOpen ? "rotate-180" : ""}`}
                />
              </span>
              {!orderSummaryOpen && (
                <strong className="font-ui text-sm text-[#171717] lg:hidden">
                  {money(total)}
                </strong>
              )}
            </button>

            {/* Slides via a large fixed max-height instead of measuring the
                panel's real scrollHeight with JS (the earlier approach) —
                bug report: the voucher field at the very bottom of the
                panel kept ending up clipped on a real iPhone even after
                fixing the sticky card's own safe-area padding, which
                pointed at the measurement itself rather than the card's
                positioning. A CSS custom property driving `max-height`
                through a `transition-[max-height]`, recomputed via
                ResizeObserver + a dependency-array effect, is exactly the
                kind of thing WebKit has known bugs re-applying correctly;
                4000px can never be reached by any realistic cart, so
                nothing is ever actually clipped once open — the only
                cost is the open transition finishing faster than 300ms
                for a short cart, not a snap or missing content.
                lg:max-h-none forces this open on desktop no matter what
                `orderSummaryOpen` is. */}
            <div
              className={`overflow-hidden transition-[max-height] duration-300 ease-out lg:max-h-none ${
                orderSummaryOpen ? "max-h-[4000px]" : "max-h-0"
              }`}
            >
              <div className="mt-6">

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
                        <span>{money(item.price * item.qty)}</span>
                      </p>
                      {!order && isOutOfStock(item.slug, item.variantId) && (
                        <p className="mt-1 flex items-center gap-2 font-ui text-xs font-medium text-red-700">
                          <span>Out of stock</span>
                          <button
                            type="button"
                            onClick={() => removeItem(cartItemKey(item))}
                            className="underline underline-offset-2 hover:text-black"
                          >
                            Remove
                          </button>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-2 border-t border-black/10 pt-4 font-ui text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <strong>-{money(discountAmount)}</strong>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <strong className="uppercase">Free</strong>
              </div>
              <div className="flex justify-between pt-2 text-base">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
              {taxAmount > 0 && (
                <p className="text-xs text-black/50">
                  Including {money(taxAmount)} in taxes
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
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
