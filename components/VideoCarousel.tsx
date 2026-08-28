"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FullProduct } from "@/data/products";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";

/**
 * Homepage product-video carousel — the `.home-section--videos` band on the
 * live site: a horizontal strip of muted, looping portrait clips, each with
 * the product's thumbnail, name and price pinned underneath.
 *
 * Structure mirrors the reference markup (section > slider > viewport > track,
 * 320px slides with a 16px gap, leading/trailing clones for the infinite
 * loop), but every value rendered here comes from OUR products API.
 */

const SLIDE_WIDTH = 320;
const GAP = 16;
const STEP = SLIDE_WIDTH + GAP;

type Slide = {
  key: string;
  slug: string;
  name: string;
  price: string;
  thumb: string;
  videoUrl: string;
};

function formatPrice(value: number): string {
  return `$${value.toFixed(2)} USD`;
}

export default function VideoCarousel({
  products,
}: {
  products: FullProduct[];
}) {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const slides = useMemo<Slide[]>(
    () =>
      products
        .filter((p) => Boolean(p.videoUrl))
        .map((p) => ({
          key: p.slug,
          slug: p.slug,
          name: p.name,
          price: formatPrice(p.price),
          thumb: p.images[0] ?? "",
          // `#t=0.1` makes the browser paint a poster frame before playback.
          videoUrl: `${p.videoUrl as string}#t=0.1`,
        })),
    [products]
  );

  const count = slides.length;
  const loopWidth = count * STEP;

  // Start the viewport on the first REAL slide (the leading clones sit before
  // it) so a scroll in either direction has content waiting.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || count === 0) return;
    el.scrollLeft = loopWidth;
  }, [count, loopWidth]);

  // Seamless infinite loop: keep scrollLeft inside [loopWidth, 2*loopWidth),
  // where the leading and trailing clones make the jump invisible.
  const onScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el || loopWidth === 0) return;
    if (el.scrollLeft < loopWidth) el.scrollLeft += loopWidth;
    else if (el.scrollLeft >= loopWidth * 2) el.scrollLeft -= loopWidth;
  }, [loopWidth]);

  const scrollByStep = (dir: 1 | -1) => {
    viewportRef.current?.scrollBy({ left: dir * STEP, behavior: "smooth" });
  };

  // Play the muted clips only while they are on screen; pause them otherwise
  // so an off-screen strip never decodes video in the background. Never
  // unmuted — autoplay with sound is both hostile and blocked by browsers.
  useEffect(() => {
    const root = viewportRef.current;
    if (!root || count === 0) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const videos = Array.from(root.querySelectorAll("video"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          video.muted = true;
          if (entry.isIntersecting && !reduceMotion) {
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.4 }
    );

    videos.forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, [count]);

  // Nothing to show on a fresh install where no product has a video yet.
  if (count === 0) return null;

  const renderSlide = (slide: Slide, clone: "leading" | "trailing" | null) => (
    <article
      key={`${clone ?? "real"}-${slide.key}`}
      className="shrink-0 w-[280px] sm:w-[320px]"
      {...(clone
        ? { "data-home-video-clone": clone, "aria-hidden": true }
        : {})}
    >
      <video
        src={slide.videoUrl}
        muted
        loop
        playsInline
        preload="metadata"
        className="block w-full aspect-[3/4] object-cover rounded-t-[10px] bg-[#111]"
      />
      <Link
        href={`/product/${slide.slug}`}
        tabIndex={clone ? -1 : undefined}
        className="grid grid-cols-[72px_1fr] items-center gap-3 bg-white p-2 rounded-b-[4px] text-ink"
      >
        <span className="relative block h-[72px] w-[72px] overflow-hidden bg-[#f5f2ee]">
          {slide.thumb && (
            <Image
              src={slide.thumb}
              alt=""
              fill
              sizes="72px"
              className="object-cover"
            />
          )}
        </span>
        <span className="grid gap-1.5 min-w-0">
          <span className="font-serif-display text-base leading-5 line-clamp-2">
            {slide.name}
          </span>
          <span className="text-xs text-ink/70">{slide.price}</span>
        </span>
      </Link>
    </article>
  );

  return (
    <section
      ref={revealRef}
      aria-label="Product videos"
      className={`mx-auto max-w-[1400px] px-6 py-8 ${revealClass}`}
    >
      <div
        className="relative"
        aria-roledescription="carousel"
        aria-label="Product videos"
      >
        <div
          ref={viewportRef}
          onScroll={onScroll}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex gap-4">
            {slides.map((s) => renderSlide(s, "leading"))}
            {slides.map((s) => renderSlide(s, null))}
            {slides.map((s) => renderSlide(s, "trailing"))}
          </div>
        </div>

        <button
          aria-label="Previous video"
          onClick={() => scrollByStep(-1)}
          className="hidden sm:flex absolute -left-4 top-1/3 -translate-y-1/2 items-center justify-center h-9 w-9 rounded-full bg-white shadow"
        >
          <ChevronLeftIcon size={16} />
        </button>
        <button
          aria-label="Next video"
          onClick={() => scrollByStep(1)}
          className="hidden sm:flex absolute -right-4 top-1/3 -translate-y-1/2 items-center justify-center h-9 w-9 rounded-full bg-white shadow"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </section>
  );
}
