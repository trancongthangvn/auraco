import Image from "next/image";

/**
 * Row of payment-method badges shown in the footer, matching the reference
 * site's `.footer-payments` strip. The reference renders these as real
 * uploaded logo images (`.payment-icons__item img`), not hand-drawn icons —
 * these are the same 8 logo files pulled from its own asset storage.
 */
const PAYMENT_LOGOS = [
  { src: "/uploads/payment-apple-pay.jpg", alt: "Apple Pay" },
  { src: "/uploads/payment-cashapp.png", alt: "Cash App" },
  { src: "/uploads/payment-method.png", alt: "Google Pay" },
  { src: "/uploads/payment-maestro.svg", alt: "Maestro" },
  { src: "/uploads/payment-mastercard.png", alt: "Mastercard" },
  { src: "/uploads/payment-paypal.png", alt: "PayPal" },
  { src: "/uploads/payment-visa.svg", alt: "Visa" },
  { src: "/uploads/payment-zelle.webp", alt: "Zelle" },
];

export default function PaymentIcons() {
  return (
    // One shared frame around the whole row, not one border per logo —
    // explicit follow-up request/bug report: the reference's own
    // `.footer-payments` strip (which this was matched to) is a single
    // bordered card holding every logo, not a row of separately-bordered
    // badges. Divider lines between logos (instead of each one's own
    // border) keep them visually distinct within that one frame.
    <div
      className="flex w-fit flex-wrap items-center gap-y-1.5 divide-x divide-gold-light/35 rounded-[6px] border border-gold-light/35 bg-white/92 px-[5.6px] py-[3.2px]"
      aria-label="Accepted payment methods"
    >
      {PAYMENT_LOGOS.map((logo, i) => (
        <span
          key={logo.alt}
          title={logo.alt}
          className={`flex h-8 w-fit shrink-0 items-center justify-center pr-3 ${i > 0 ? "pl-3" : ""}`}
        >
          <Image
            src={logo.src}
            alt={logo.alt}
            width={48}
            height={24}
            className="h-6 w-auto object-contain"
          />
        </span>
      ))}
    </div>
  );
}
