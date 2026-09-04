"use client";

import Image from "next/image";
import Link from "next/link";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";

export type CollectionTile = {
  name: string;
  href: string;
  img: string;
};

export default function Collections({
  collections,
}: {
  collections: CollectionTile[];
}) {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();

  return (
    <section
      ref={revealRef}
      className={`home-block mx-auto ${revealClass}`}
    >
      <h2 className="font-serif-display section-title">
        Collections
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
        {collections.map((c) => (
          <Link
            key={c.name}
            href={c.href}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-[#2b261f]/[0.08] bg-[#faf8f4] transition-transform duration-300 ease-out hover:z-10 hover:scale-[1.015] hover:shadow-[0_10px_24px_rgba(43,38,31,0.08)]"
          >
            {/* A collection added in the admin without an image yields an
                empty `img`; rendering <Image src=""> there shows a broken
                image icon, so fall back to the tinted placeholder box.
                Taller on mobile (bigger frame within the 2-col grid),
                reverts to the original 4:3 once there's room for 3 columns. */}
            <span className="relative block aspect-[5/4] overflow-hidden bg-[#e9e4dc] sm:aspect-[4/3]">
              {c.img && (
                <Image
                  src={c.img}
                  alt={c.name}
                  fill
                  sizes="(min-width: 1448px) 450px, (min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              )}
            </span>
            <span className="flex flex-col items-center gap-[0.35rem] pb-3 pl-2 pr-2 pt-2.5 text-center sm:pb-[18.4px] sm:pl-[17.6px] sm:pr-[17.6px] sm:pt-4">
              <span className="font-display-serif whitespace-nowrap text-[14px] font-normal leading-[16px] text-[#28241f] sm:text-[19px] sm:leading-[21.85px]">
                {c.name}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
