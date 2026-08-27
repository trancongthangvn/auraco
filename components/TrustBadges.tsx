import { trustBadges } from "@/data/site";

export default function TrustBadges() {
  return (
    <section className="bg-gradient-to-r from-[#a67c3d] to-[#7e5d2d] text-white">
      <div className="mx-auto max-w-[1400px] px-6 py-6 flex flex-wrap justify-center gap-x-12 gap-y-3 text-sm tracking-[0.15em]">
        {trustBadges.map((b) => (
          <span key={b}>{b}</span>
        ))}
      </div>
    </section>
  );
}
