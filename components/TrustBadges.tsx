"use client";

import { trustBadges } from "@/data/site";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";
import { WarrantyBadgeIcon, TruckIcon, ReturnBoxIcon } from "@/components/icons";

const badgeIcons = [WarrantyBadgeIcon, TruckIcon, ReturnBoxIcon];

export default function TrustBadges() {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();

  return (
    <section
      ref={revealRef}
      className={`bg-gradient-to-r from-[#a67c3d] to-[#7e5d2d] text-white ${revealClass}`}
    >
      {/* Three states, all measured directly off auracojewelry.com (none of
          them stock Tailwind breakpoints): 3-across on phones (≤767px,
          compact), a single stacked column in the awkward tablet range
          (768–960px), then 3-across again from 961px up. Confirmed at each
          boundary (767 still 3-across, 768 stacks, 960 still stacks, 961
          back to 3-across) — the tablet band is a genuine dip, not a typo. */}
      <div className="mx-auto grid grid-cols-3 gap-[clamp(1.2rem,3vw,37.68px)] px-2 py-10 min-[768px]:grid-cols-1 min-[961px]:grid-cols-3 sm:px-12 sm:py-[49.6px]">
        {trustBadges.map((b, i) => {
          const Icon = badgeIcons[i % badgeIcons.length];
          return (
            <div
              key={b}
              className="flex flex-col items-center justify-center gap-[clamp(1rem,2vw,21.6px)] px-2 text-center"
            >
              <Icon size={34} className="min-[961px]:hidden" />
              <Icon size={50} className="hidden min-[961px]:block" />
              <span className="font-ui text-[clamp(0.85rem,1.45vw,18.2px)] font-normal uppercase leading-[21.85px] tracking-[1.09px]">
                {b}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
