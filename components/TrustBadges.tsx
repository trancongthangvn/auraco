"use client";

import { trustBadges } from "@/data/site";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";

export default function TrustBadges() {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();

  return (
    <section
      ref={revealRef}
      className={`bg-gradient-to-r from-[#a67c3d] to-[#7e5d2d] text-white ${revealClass}`}
    >
      <div className="mx-auto max-w-[1400px] px-6 py-6 flex flex-wrap justify-center gap-x-12 gap-y-3 text-sm tracking-[0.15em]">
        {trustBadges.map((b) => (
          <span key={b}>{b}</span>
        ))}
      </div>
    </section>
  );
}
