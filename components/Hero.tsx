"use client";

import { useEffect, useRef, useState } from "react";
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

/** Slide transition, in ms — must match the `duration-700` class below. */
const HERO_DURATION = 700;
/** Auto-advance interval, in ms — matches Gallery.tsx's own hero
 *  auto-advance (its only other use of this timing in the codebase). */
const HERO_AUTOPLAY = 5000;

export default function Hero({ slides }: { slides: HeroSlide[] }) {
  const heroSlides = slides;
  const count = heroSlides.length;

  // Driven by an index into a TRIPLED slide list and moved with a CSS
  // transform, matching ProductCarousel.tsx / Journal.tsx — replacing the
  // previous stacked-opacity crossfade. Opacity blended slides on top of
  // each other; the request was for the previous image to slide out edge-to-
  // edge as the next one slides in ("ảnh trước liền ảnh sau"), which needs an
  // actual translate strip, not a blend. Hero only ever shows one slide at a
  // time (no multi-card-per-view math like ProductCarousel's), so each
  // "copy" is simply the full-width slide stacked left-to-right and the
  // offset is a plain percentage — no viewport-width measuring needed.
  const [index, setIndex] = useState(count);
  const [animate, setAnimate] = useState(true);
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>({ fadeOnly: true });
  const touchStart = useRef({ x: 0, y: 0 });
  const dragLockedRef = useRef(false);

  const prev = () => setIndex((i) => i - 1);
  const next = () => setIndex((i) => i + 1);

  // Snap back into the middle copy whenever the index drifts into the first
  // or third copy, so the strip can be stepped through forever in either
  // direction — same pattern as ProductCarousel.tsx / Journal.tsx.
  useEffect(() => {
    if (count === 0) return;
    if (index >= count * 2 || index < count) {
      const id = setTimeout(() => {
        setAnimate(false);
        setIndex((i) => (i >= count * 2 ? i - count : i + count));
      }, HERO_DURATION);
      return () => clearTimeout(id);
    }
  }, [index, count]);

  // Re-enable the transition on the tick after a wrap.
  useEffect(() => {
    if (animate) return;
    const id = setTimeout(() => setAnimate(true), 20);
    return () => clearTimeout(id);
  }, [animate]);

  // Auto-advance every 5s. Keyed off `index` itself (not a fixed-interval
  // timer), matching Gallery.tsx's hero auto-advance — a manual arrow/dot
  // click or swipe changes `index`, which tears down this effect and
  // reschedules a fresh 5s window from wherever the customer just jumped to,
  // instead of racing an in-flight timer.
  useEffect(() => {
    if (count <= 1) return;
    const id = setTimeout(() => {
      setIndex((i) => i + 1);
    }, HERO_AUTOPLAY);
    return () => clearTimeout(id);
  }, [index, count]);

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    dragLockedRef.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    const t = e.changedTouches[0];
    const deltaX = t.clientX - touchStart.current.x;
    const deltaY = t.clientY - touchStart.current.y;
    const SWIPE_THRESHOLD = 45;

    if (
      Math.abs(deltaX) > SWIPE_THRESHOLD &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      if (deltaX < 0) {
        next();
      } else {
        prev();
      }
    }
    dragLockedRef.current = false;
  };

  // React attaches its synthetic `touchmove` as a passive listener (for
  // scroll-perf reasons), so `preventDefault()` from a JSX `onTouchMove`
  // handler is silently ignored — this is why swiping could still visibly
  // drag the whole page frame sideways mid-gesture even with touch-pan-y set
  // (that only hints the browser about *scroll* ownership, not its own edge-
  // navigation gesture). Attaching the listener manually with
  // `{ passive: false }` is the only way `preventDefault()` actually takes
  // effect once horizontal intent is clear, locking the gesture to this
  // banner instead of letting the browser's own page-drag take over.
  useEffect(() => {
    const el = revealRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const deltaX = t.clientX - touchStart.current.x;
      const deltaY = t.clientY - touchStart.current.y;
      if (dragLockedRef.current || (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY))) {
        dragLockedRef.current = true;
        e.preventDefault();
      }
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [revealRef]);

  // The currently active REAL slide, derived from the tripled-list index —
  // same normalization ProductCarousel/Journal use for their dot highlight,
  // reused here for the dots AND the text overlay content.
  const active = count === 0 ? 0 : ((index % count) + count) % count;
  const slide = heroSlides[active];

  if (!slide) return null;

  return (
    <section
      ref={revealRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      // touch-pan-y tells the browser this element handles horizontal
      // gestures itself — without it, a full-width swipe can still be
      // claimed by the browser's own edge-swipe/back-navigation handling
      // mid-gesture, which is what let the whole page frame drift instead
      // of staying locked to the slide strip.
      className={`group/banner relative w-full aspect-[1400/788] min-h-[420px] max-h-[85vh] touch-pan-y overflow-hidden ${revealClass}`}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`flex h-full ${
            animate ? "transition-transform duration-700 ease-out" : ""
          }`}
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {[0, 1, 2].flatMap((copy) =>
            heroSlides.map((s, i) => (
              <div
                key={`${copy}-${s.img || i}`}
                aria-hidden={copy === 1 ? undefined : true}
                className="relative h-full w-full shrink-0 overflow-hidden"
              >
                {/* Guard an empty image_url so a half-configured slide
                    degrades to the dark overlay rather than a broken image. */}
                {s.img && (
                  <Image
                    src={s.img}
                    alt={s.title}
                    fill
                    priority={copy === 1 && i === 0}
                    loading={copy === 1 && i === 0 ? undefined : "eager"}
                    sizes="100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover/banner:scale-[1.04]"
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-end gap-1 px-2 py-10 text-center sm:px-14"
        style={{
          background:
            "linear-gradient(100deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.22) 48%, rgba(0,0,0,0.08) 100%)",
        }}
      >
        {/* 37.4px flat from the smallest phone up through tablet, then a
            hard jump to 52px at md (768px) — measured directly on the
            reference at 320/390/600/700/768px: not a fluid vw scale at all,
            it's flat below md and flat again above it. The previous
            clamp(2rem,8vw,3.25rem) undershot every mobile/tablet width
            (32px instead of 37.4px) since 8vw only reaches the clamp's own
            2rem floor there. leading/tracking stay relative units (already
            correct) so they scale with either step automatically. */}
        <h1 className="font-serif-display text-[37.4px] md:text-[52px] font-normal uppercase leading-[1.05] tracking-[0.045em] text-white">
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
        className="absolute left-3 top-1/2 z-20 hidden sm:flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-opacity hover:opacity-80"
      >
        <ChevronLeftIcon size={20} />
      </button>
      <button
        aria-label="Next slide"
        onClick={next}
        className="absolute right-3 top-1/2 z-20 hidden sm:flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-opacity hover:opacity-80"
      >
        <ChevronRightIcon size={20} />
      </button>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-[7px]">
        {heroSlides.map((s, i) => (
          <button
            key={s.label}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(count + i)}
            className={`h-[9px] w-[9px] rounded-full transition-colors hover:bg-white/75 ${
              i === active ? "bg-white" : "bg-white/45"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
