"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { heroSlides } from "@/data/site";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export default function Hero() {
  const [index, setIndex] = useState(0);
  const slide = heroSlides[index];

  const prev = () =>
    setIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  const next = () => setIndex((i) => (i + 1) % heroSlides.length);

  return (
    <section className="relative h-[70vh] min-h-[420px] w-full overflow-hidden">
      <Image
        src={slide.img}
        alt={slide.title}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-black/5" />

      <div className="relative z-10 flex h-full flex-col justify-end px-8 pb-16 sm:px-16">
        <p className="text-white/90 tracking-[0.25em] text-sm mb-3">
          {slide.label}
        </p>
        <h1 className="font-serif-display text-white text-4xl sm:text-5xl max-w-xl leading-tight mb-6">
          {slide.title}
        </h1>
        <Link
          href={slide.href}
          className="inline-block w-fit border border-white px-6 py-3 text-sm tracking-wide text-white hover:bg-white hover:text-[#2b261f] transition-colors"
        >
          DISCOVER NOW
        </Link>
      </div>

      <button
        aria-label="Previous slide"
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white px-2 hover:opacity-70"
      >
        <ChevronLeftIcon size={22} />
      </button>
      <button
        aria-label="Next slide"
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white px-2 hover:opacity-70"
      >
        <ChevronRightIcon size={22} />
      </button>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {heroSlides.map((s, i) => (
          <button
            key={s.label}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
