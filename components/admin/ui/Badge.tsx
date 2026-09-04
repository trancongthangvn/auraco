type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-black/5 text-black/60",
  success: "bg-green-50 text-green-700",
  warning: "bg-[#fbf0d2] text-[#8a6a17]",
  danger: "bg-[#fbe3e1] text-[#c0392b]",
  info: "bg-blue-50 text-blue-700",
};

/** Full pill (not the old rounded-md chip), uppercase — matches the
 *  reference admin's own status pills (measured from a screenshot of its
 *  Dashboard "Recent orders" table: PENDING pale-yellow, CANCELLED
 *  pale-red, both fully rounded with uppercase text). */
export default function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
