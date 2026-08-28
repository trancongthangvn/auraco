type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-black/5 text-black/60",
  success: "bg-green-50 text-green-700",
  warning: "bg-gold/10 text-gold",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

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
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
