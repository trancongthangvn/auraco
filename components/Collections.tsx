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
      className={`mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 ${revealClass}`}
    >
      <h2 className="font-serif-display text-[2rem] sm:text-[2.35rem] font-bold text-center text-[#2b261f] mb-4">
        Collections
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {collections.map((c) => (
          <Link
            key={c.name}
            href={c.href}
            className="group flex flex-col overflow-hidden rounded-xl border border-[#2b261f]/[0.08] bg-[#faf8f4] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(43,38,31,0.08)]"
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
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              )}
            </span>
            <span className="px-4 py-4 text-center">
              <span className="font-serif-display text-sm sm:text-base font-normal text-[#2b261f]">
                {c.name}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
