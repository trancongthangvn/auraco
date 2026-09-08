import type { Viewport } from "next";
import CheckoutClient from "@/components/checkout/CheckoutClient";

export const metadata = {
  title: "Checkout | AURA & CO",
};

// Scoped to this route only (doesn't touch the root layout's own viewport
// export, so no other page is affected) — bug report: the mobile order-
// summary card's voucher field, right at the bottom of the page, was
// getting covered by an iPhone's home-indicator gesture bar. The fix
// (CheckoutClient.tsx's safe-area padding-bottom) turned out to have no
// effect on a real device: `env(safe-area-inset-*)` only ever resolves to a
// non-zero value when the page opts into `viewport-fit=cover` — without it
// (the default, inherited from the root layout), the browser already keeps
// content clear of the unsafe area on its own and env() always reads 0, so
// that padding was silently adding nothing. viewport-fit=cover is what
// makes the real inset value available to actually pad against.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
