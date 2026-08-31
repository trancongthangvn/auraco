"use client";

import Image from "next/image";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";

export default function ITGirlEdit() {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();
  const visible = revealClass.includes("is-visible");

  return (
    <section
      ref={revealRef}
      /* Full-bleed, per the reference's `.home-stories` (its 1100px fallback
         is overridden to max-width:none downstream) — but NOT an even split.
         The reference fixes its text column at 450px and lets the photo take
         every pixel of what's left (`.home-stories__description { width:
         450px }`, `.home-stories__img { width:auto; object-fit:contain }`).
         A 50/50 split undersized the photo relative to the reference. */
      className="home-block mx-auto flex flex-col items-center gap-[clamp(1.5rem,4vw,48px)] bg-[#f5f5f5] lg:flex-row"
    >
      <div
        className={`relative aspect-[16/9] w-full min-w-0 overflow-hidden rounded-[14px] lg:flex-1 reveal-from-start${
          visible ? " is-visible" : ""
        }`}
      >
        <Image
          src="/images/pages/64e5ed6e-0491-4f3d-a678-b315945972da.png"
          alt="The IT-Girl Edit"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain"
        />
      </div>
      <div
        className={`w-full lg:w-[450px] lg:shrink-0 reveal-from-end${visible ? " is-visible" : ""}`}
      >
        <h2 className="font-serif-display mb-4 text-[clamp(1.5rem,2.6vw,32px)] font-normal leading-[1.25] text-[#28241f]">
          The IT-Girl Edit: Effortless Edge & Sterling Chic
        </h2>
        <p className="text-[16px] font-normal leading-[1.7] text-[#2b261f]">
          Redefine your everyday sparkle with pieces curated for the modern
          trendsetter. Blending effortless streetwear cool with high-shine
          sterling silver sophistication, this collection is designed for the
          girl who sets the standard instead of following it. From coffee runs to VIP
          nights out, make every look unforgettable.
        </p>
      </div>
    </section>
  );
}
