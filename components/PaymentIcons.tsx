import type { ReactNode } from "react";

/**
 * Row of payment-method badges shown in the footer, matching the reference
 * site's `.footer-payments` strip. Simplified but recognizable renderings of
 * each brand mark — standard practice for indicating accepted payment
 * methods (nominative use), not a reproduction of the client's own content.
 */
function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`flex h-8 w-[52px] shrink-0 items-center justify-center rounded-[6px] border border-gold-light/35 bg-white/92 px-[5.6px] py-[3.2px] ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export default function PaymentIcons() {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
      <Badge className="!bg-black">
        <svg width="26" height="12" viewBox="0 0 26 12" fill="#fff" aria-hidden="true">
          <path d="M4.9 2.3c.3-.4.5-.9.5-1.4-.4 0-.9.3-1.2.6-.3.3-.5.8-.5 1.3.5 0 1-.2 1.2-.5Z" />
          <path d="M5.4 2.9c-.7 0-1.3.4-1.6.4-.3 0-.8-.4-1.4-.4-.7 0-1.4.4-1.7 1.1-.7 1.3-.2 3.2.5 4.3.4.5.8 1.1 1.4 1.1.5 0 .7-.4 1.4-.4.7 0 .9.4 1.4.4.6 0 1-.5 1.3-1 .4-.6.6-1.1.6-1.2 0 0-1.1-.4-1.1-1.7 0-1.1.9-1.6 1-1.6-.5-.8-1.3-.9-1.6-1H5.4Z" />
          <text x="9.5" y="9.5" fontSize="9" fontFamily="Arial, sans-serif">Pay</text>
        </svg>
      </Badge>
      <Badge className="!bg-[#00D64F]">
        <span className="text-white text-sm font-bold">$</span>
      </Badge>
      <Badge>
        <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true">
          <text x="0" y="9.5" fontSize="8.5" fontFamily="Arial, sans-serif" fontWeight="600">
            <tspan fill="#4285F4">G</tspan>
            <tspan fill="#5f6368"> Pay</tspan>
          </text>
        </svg>
      </Badge>
      <Badge>
        <svg width="24" height="14" viewBox="0 0 24 14" aria-hidden="true">
          <circle cx="9" cy="7" r="6" fill="#EB001B" />
          <circle cx="15" cy="7" r="6" fill="#00A2E5" fillOpacity="0.85" />
        </svg>
      </Badge>
      <Badge>
        <svg width="24" height="14" viewBox="0 0 24 14" aria-hidden="true">
          <circle cx="9" cy="7" r="6" fill="#EB001B" />
          <circle cx="15" cy="7" r="6" fill="#F79E1B" fillOpacity="0.85" />
        </svg>
      </Badge>
      <Badge>
        <span className="text-[11px] font-bold italic text-[#003087]">
          Pay<span className="text-[#009cde]">Pal</span>
        </span>
      </Badge>
      <Badge>
        <span className="text-[11px] font-bold italic tracking-tight text-[#1A1F71]">VISA</span>
      </Badge>
      <Badge className="!bg-[#6D1ED4]">
        <span className="font-serif italic text-white text-sm">Z</span>
      </Badge>
    </div>
  );
}
