"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";

export type HeroSlide = {
  label: string;
  title: string;
  href: string;
  img: string;
};

export default function Hero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const heroSlides = slides;
  const slide = heroSlides[index];
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>({ fadeOnly: true });

  if (!slide) return null;

  const prev = () =>
    setIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  const next = () => setIndex((i) => (i + 1) % heroSlides.length);

  return (
    <section
      ref={revealRef}
      className={`group/banner relative w-full aspect-[1400/788] min-h-[420px] max-h-[85vh] overflow-hidden ${revealClass}`}
    >
      {/* Guard an empty image_url so a half-configured slide degrades to the
          dark overlay rather than a broken image. */}
      {slide.img && (
        <Image
          src={slide.img}
          alt={slide.title}
          fill
          priority
          sizes="100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover/banner:scale-[1.04]"
        />
      )}

      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-end gap-1 px-2 py-10 text-center sm:px-14"
        style={{
          background:
            "linear-gradient(100deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.22) 48%, rgba(0,0,0,0.08) 100%)",
        }}
      >
        <h1 className="font-serif-display text-[clamp(2rem,8vw,3.25rem)] font-normal uppercase leading-[1.05] tracking-[0.045em] text-white">
          {slide.label}
        </h1>
        <p className="font-ui max-w-[310px] text-[15px] font-normal uppercase leading-[22.2px] tracking-[1.125px] text-white/[0.92]">
          {slide.title}
        </p>
        <Link
          href={slide.href}
          className="font-ui group relative mt-1 inline-block w-fit border-b border-white/75 pb-1.5 pt-1 text-[12px] font-normal uppercase leading-[12px] tracking-[1.2px] text-white transition-[letter-spacing] duration-300 hover:tracking-[0.13em]"
        >
          DISCOVER NOW
        </Link>
      </div>

      <button
        aria-label="Previous slide"
        onClick={prev}
        className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-opacity hover:opacity-80"
      >
        <ChevronLeftIcon size={20} />
      </button>
      <button
        aria-label="Next slide"
        onClick={next}
        className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-opacity hover:opacity-80"
      >
        <ChevronRightIcon size={20} />
      </button>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-[7px]">
        {heroSlides.map((s, i) => (
          <button
            key={s.label}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-[9px] w-[9px] rounded-full transition-colors ${
              i === index ? "bg-white" : "bg-white/45"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
