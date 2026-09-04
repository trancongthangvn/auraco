export default function PageHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-[543px] px-6 pt-12 pb-6">
      <h1 className="font-serif-display text-[38px] font-normal tracking-[0.02em] mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-black/60 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
