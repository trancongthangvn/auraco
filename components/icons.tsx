type IconProps = {
  className?: string;
  size?: number;
};

const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function SearchIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.8} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" />
      <path d="M16.2 16.2 20.5 20.5" />
    </svg>
  );
}

export function UserIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.8} className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5c1.4-3.2 4-4.75 6.5-4.75s5.1 1.55 6.5 4.75" />
    </svg>
  );
}

export function BagIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.8} className={className} aria-hidden="true">
      <path d="M7.25 8.75h9.5a2 2 0 0 1 1.99 1.82l.58 6.4a2.75 2.75 0 0 1-2.74 3H7.42a2.75 2.75 0 0 1-2.74-3l.58-6.4a2 2 0 0 1 1.99-1.82Z" />
      <path d="M8.75 11.5V7.75a3.25 3.25 0 0 1 6.5 0v3.75" />
    </svg>
  );
}

export function ChevronLeftIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <polyline points="15 4 7 12 15 20" />
    </svg>
  );
}

export function ChevronRightIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <polyline points="9 4 17 12 9 20" />
    </svg>
  );
}

export function ArrowRightIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <line x1="4" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

export function CloseIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

export function PlusIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function MinusIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function CheckIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <polyline points="4 12 9.5 17.5 20 6" />
    </svg>
  );
}

/**
 * Scalloped "verified" badge for the feedback-card avatar tick — the exact
 * outline the shop owner supplied, recoloured from its source blue/white to
 * the site's own gold (`#f0b429`, matching the reference's own verified-tick
 * colour) with a white check for contrast, instead of a plain circle.
 */
export function VerifiedBadgeIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        d="m19.36 9v-2.36a2 2 0 0 0 -2-2h-2.31l-1.64-1.64a2 2 0 0 0 -2.82 0l-1.59 1.64h-2.36a2 2 0 0 0 -2 2v2.36l-1.64 1.59a2 2 0 0 0 0 2.82l1.64 1.64v2.31a2 2 0 0 0 2 2h2.36l1.59 1.64a2 2 0 0 0 2.82 0l1.64-1.64h2.31a2 2 0 0 0 2-2v-2.31l1.64-1.64a2 2 0 0 0 0-2.82z"
        fill="#f0b429"
      />
      <path
        d="m11.25 14.5a1 1 0 0 1 -.71-.29l-1.54-1.5a1 1 0 0 1 1.42-1.42l.79.8 2.29-2.3a1 1 0 0 1 1.5 1.42l-3 3a1 1 0 0 1 -.75.29z"
        fill="#fff"
      />
    </svg>
  );
}

export function WarrantyBadgeIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M24 4.5l3.5 3 4.6-1 2 4.2 4.6.8.1 4.7 3.6 3-1.8 4.3 1.8 4.3-3.6 3-.1 4.7-4.6.8-2 4.2-4.6-1-3.5 3-3.5-3-4.6 1-2-4.2-4.6-.8-.1-4.7-3.6-3 1.8-4.3-1.8-4.3 3.6-3 .1-4.7 4.6-.8 2-4.2 4.6 1 3.5-3z" />
      <circle cx="24" cy="23.5" r="9.5" />
      <path d="M18.8 23.8l3.7 3.7 6.9-7.4" />
    </svg>
  );
}

export function GemIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M6 3h12l3.5 5L12 21 2.5 8Z" />
      <path d="M2.5 8h19" />
      <path d="M9 3 6 8l6 13" />
      <path d="M15 3l3 5-6 13" />
    </svg>
  );
}

export function GiftIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <rect x="3" y="9.5" width="18" height="4" />
      <rect x="4.5" y="13.5" width="15" height="8" />
      <line x1="12" y1="9.5" x2="12" y2="21.5" />
      <path d="M12 9.5C10.5 5.5 6.5 4.5 6.5 7.2 6.5 9 9.5 9.5 12 9.5Z" />
      <path d="M12 9.5C13.5 5.5 17.5 4.5 17.5 7.2 17.5 9 14.5 9.5 12 9.5Z" />
    </svg>
  );
}

export function TruckIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 30h26.5V16H12" />
      <path d="M31.5 22.5h6.7l4.8 5.2V30h-11.5" />
      <path d="M10 34.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z" />
      <path d="M35.5 34.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z" />
      <path d="M4 18h11M2.5 22h9.5M6 26h9" />
    </svg>
  );
}

/** The cart page's own trust row uses different icons from the homepage's
 *  TrustBadges band (28x28 viewBox, not 48x48) — matched from the
 *  reference's `.cart-page__trust` markup directly. */
export function ShipBagIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 10.5 4 12v9.5a1.5 1.5 0 0 0 1.5 1.5H22a1.5 1.5 0 0 0 1.5-1.5V12l-2-1.5" />
      <path d="M6 10.5h16l-1.5-3H7.5L6 10.5z" />
      <path d="M10 10.5V8M18 10.5V8" />
      <path d="M3 12h3M22 12h3" />
    </svg>
  );
}

export function CheckCircleIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="10" />
      <path d="M9.5 14.2l3.2 3.2 6.8-7" />
    </svg>
  );
}

export function ReturnBoxIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 10h21v26H16z" />
      <path d="M16 10l4-5h21l-4 5" />
      <path d="M37 10l4-5v26l-4 5" />
      <path d="M20 18h13" />
      <path d="M15 30H6.5" />
      <path d="M10 24l-6 6 6 6" />
    </svg>
  );
}

export function SparkleIcon({ className, size }: IconProps) {
  return (
    <svg
      width={size ?? 14}
      height={size ?? 14}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2c.7 3.6 2.4 5.3 6 6-3.6.7-5.3 2.4-6 6-.7-3.6-2.4-5.3-6-6 3.6-.7 5.3-2.4 6-6Z" />
    </svg>
  );
}

export function StarIcon({
  className,
  size = 14,
  filled = true,
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2l2.95 6.6 7.05.7-5.3 4.92 1.55 7.18L12 17.85 5.75 21.4 7.3 14.22 2 9.3l7.05-.7L12 2z" />
    </svg>
  );
}

export function StarRating({
  rating,
  size = 14,
  className = "",
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  const full = Math.round(rating);
  return (
    <span className={`inline-flex items-center gap-[1.6px] text-black ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          size={size}
          filled={i < full}
          className={i < full ? undefined : "opacity-[0.35]"}
        />
      ))}
    </span>
  );
}

export function MenuIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function ChevronDownIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <polyline points="5 8.5 12 15.5 19 8.5" />
    </svg>
  );
}

export function GlobeIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <ellipse cx="12" cy="12" rx="3.4" ry="8.5" />
      <line x1="3.7" y1="9" x2="20.3" y2="9" />
      <line x1="3.7" y1="15" x2="20.3" y2="15" />
    </svg>
  );
}

export function GoogleIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.08 3.56-5.14 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.28v3.09C3.25 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.88 12c0-.8.14-1.57.39-2.29V6.62H1.28A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
