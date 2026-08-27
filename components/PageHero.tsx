export default function PageHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-[#f7f4f0] py-14 text-center px-6">
      <h1 className="font-serif-display text-4xl mb-3">{title}</h1>
      {subtitle && (
        <p className="text-sm text-black/60 max-w-xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}
