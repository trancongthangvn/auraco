"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/site";
import { ChevronLeftIcon, ChevronRightIcon, StarRating } from "@/components/icons";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";

export default function ProductCarousel({
  title,
  subtitle,
  products,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();

  const scrollBy = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section
      ref={revealRef}
      className={`mx-auto max-w-[1400px] px-6 py-16 ${revealClass}`}
    >
      <div className="text-center mb-5">
        <h2 className="font-serif-display text-[26px] font-semibold mb-2">{title}</h2>
        {subtitle && (
          <p className="text-sm text-black/60 max-w-xl mx-auto">{subtitle}</p>
        )}
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex gap-6 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p) => (
            <Link
              key={p.name}
              href={p.href}
              className="group shrink-0 w-[260px]"
            >
              {/* A product saved without any image gives an empty src, which
                  renders as a broken image icon — fall back to the tinted box. */}
              <div className="relative aspect-square overflow-hidden bg-[#f5f2ee] mb-3">
                {p.img && (
                  <Image
                    src={p.img}
                    alt={p.name}
                    fill
                    sizes="260px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <p className="flex items-center gap-1 mb-1">
                <StarRating rating={p.rating} size={12} />
                <span className="text-xs text-black/50">({p.rating})</span>
              </p>
              <h3 className="text-[19px] font-medium mb-1">{p.name}</h3>
              <p className="text-xs text-black/50 mb-1">{p.material}</p>
              <p className="text-base">{p.price}</p>
            </Link>
          ))}
        </div>

        <button
          aria-label="Previous"
          onClick={() => scrollBy(-1)}
          className="hidden sm:flex absolute -left-4 top-1/3 -translate-y-1/2 items-center justify-center h-9 w-9 rounded-full bg-white shadow"
        >
          <ChevronLeftIcon size={16} />
        </button>
        <button
          aria-label="Next"
          onClick={() => scrollBy(1)}
          className="hidden sm:flex absolute -right-4 top-1/3 -translate-y-1/2 items-center justify-center h-9 w-9 rounded-full bg-white shadow"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </section>
  );
}
