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
      {/* Three across on phones too — stacking them turned a one-line trust
            strip into most of a screen. */}
      <div className="mx-auto grid grid-cols-3 gap-[clamp(1.2rem,3vw,37.68px)] px-2 py-10 sm:px-12 sm:py-[49.6px]">
        {trustBadges.map((b, i) => {
          const Icon = badgeIcons[i % badgeIcons.length];
          return (
            <div
              key={b}
              className="flex flex-col items-center justify-center gap-[clamp(1rem,2vw,21.6px)] px-2 text-center"
            >
              <Icon size={34} className="sm:hidden" />
              <Icon size={50} className="hidden sm:block" />
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
