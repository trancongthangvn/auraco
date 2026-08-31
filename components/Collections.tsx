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
      <div className="grid grid-cols-2 gap-[0.65rem] sm:grid-cols-3 sm:gap-4">
        {collections.map((c) => (
          <Link
            key={c.name}
            href={c.href}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-[#2b261f]/[0.08] bg-[#faf8f4] transition-transform duration-300 ease-out hover:z-10 hover:scale-[1.04] hover:shadow-[0_18px_40px_rgba(43,38,31,0.08)]"
          >
            {/* A collection added in the admin without an image yields an
                empty `img`; rendering <Image src=""> there shows a broken
                image icon, so fall back to the tinted placeholder box. */}
            <span className="relative block aspect-[4/3] overflow-hidden bg-[#e9e4dc]">
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
            <span className="flex flex-col gap-[0.35rem] pb-[18.4px] pl-[17.6px] pr-[17.6px] pt-4 text-center">
              <span className="font-display-serif text-[19px] font-normal leading-[21.85px] text-[#28241f]">
                {c.name}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
