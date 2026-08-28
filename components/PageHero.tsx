export default function PageHero({
  title,
  subtitle,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="mx-auto max-w-[560px] px-6 pt-12 pb-6">
        <h1 className="font-sans text-[19px] font-medium uppercase tracking-[0.08em] mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-black/60 leading-relaxed">{subtitle}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[650px] px-6 pt-12 pb-6">
      <h1 className="font-serif-display text-[38px] font-normal tracking-[0.02em] mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-black/60 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
