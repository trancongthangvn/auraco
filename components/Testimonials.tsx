export type Testimonial = {
  initials: string;
  name: string;
  date: string;
  quote: string;
};

export default function Testimonials({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  return (
    <section className="bg-[#f7f4f0] py-16">
      <div className="mx-auto max-w-[1400px] px-6">
        <h2 className="font-serif-display text-3xl text-center mb-10">
          Feedback
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name + t.date} className="bg-white p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2b261f] text-white text-xs">
                  {t.initials}
                </span>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-black/50">{t.date}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-black/80">
                “{t.quote}”
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
