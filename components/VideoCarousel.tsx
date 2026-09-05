"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FullProduct } from "@/data/products";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatPrice } from "@/lib/currency";

/**
 * Homepage product-video carousel — the reference site's `.home-video-slider`:
 * a strip of muted portrait clips, each with the product's thumbnail, name
 * and price pinned underneath, the centred one scaled up and playing.
 *
 * The strip is driven by an index into a tripled slide list and moved with a
 * CSS transform, not by scrolling. Scroll-based looping fought the browser's
 * own smooth-scroll animation — it kept driving towards a position the loop
 * had already shifted, so the strip walked to the end and stuck. A transform
 * is deterministic: the wrap is a single jump with the transition switched off
 * for one tick, which the eye never catches.
 *
 * Advance is driven by the active clip's own `ended` event (explicit
 * request, reversing an earlier fixed-timer approach that kept every step
 * the same length regardless of clip duration — deliberately accepting that
 * different clips now advance at uneven intervals, since the requirement is
 * to let each video finish playing before moving on). AUTO_ADVANCE_FALLBACK_MS
 * covers a clip that fails to fire `ended` (autoplay blocked, load error, a
 * clip with no video at all) so the strip never stalls indefinitely.
 */

const SLIDE_WIDTH = 300;
const GAP = 24;
const STEP = SLIDE_WIDTH + GAP;
const DURATION = 520;
const AUTO_ADVANCE_FALLBACK_MS = 8000;

type Slide = {
  key: string;
  slug: string;
  name: string;
  price: string;
  thumb: string;
  videoUrl: string;
};

export default function VideoCarousel({
  products,
}: {
  products: FullProduct[];
}) {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();
  const { currency, rates } = useCurrency();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [viewportWidth, setViewportWidth] = useState(0);

  const slides = useMemo<Slide[]>(
    () =>
      products
        .filter((p) => Boolean(p.videoUrl))
        .map((p) => ({
          key: p.slug,
          slug: p.slug,
          name: p.name,
          price: formatPrice(p.price, currency, rates[currency]),
          thumb: p.images[0] ?? "",
          // `#t=0.1` makes the browser paint the first frame as a poster
          // before playback starts — without it the tile is a black box.
          videoUrl: `${p.videoUrl as string}#t=0.1`,
        })),
    [products, currency, rates]
  );

  const count = slides.length;
  // Start in the middle copy so a step in either direction has slides waiting.
  const [index, setIndex] = useState(count);
  const [animate, setAnimate] = useState(true);

  // Re-seed the index when the slide list changes — adjusted during render
  // rather than in an effect, so the strip never paints at a stale offset.
  const [seededFor, setSeededFor] = useState(count);
  if (seededFor !== count) {
    setSeededFor(count);
    setIndex(count);
  }

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setViewportWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Snap back to the middle copy once the wrap animation has finished, with
  // the transition off for a single tick so the jump is invisible.
  useEffect(() => {
    if (count === 0) return;
    if (index >= count && index < count * 2) return;
    const id = setTimeout(() => {
      setAnimate(false);
      setIndex((i) => (i < count ? i + count : i - count));
    }, DURATION);
    return () => clearTimeout(id);
  }, [index, count]);

  useEffect(() => {
    if (animate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  // Advance when the active clip finishes playing — see the file-level
  // comment. The fallback timer guards a clip that never fires `ended`
  // (autoplay blocked, a load error, or no video source at all); it resets
  // whenever `index` changes, same as the `ended` listener below, so a
  // manual prev/next click gets its own full window rather than an
  // immediate follow-up jump.
  useEffect(() => {
    if (count === 0) return;
    const video = videoRefs.current[index];
    const advance = () => setIndex((i) => i + 1);
    video?.addEventListener("ended", advance);
    const id = setTimeout(advance, AUTO_ADVANCE_FALLBACK_MS);
    return () => {
      video?.removeEventListener("ended", advance);
      clearTimeout(id);
    };
  }, [index, count]);

  // Play only the centred (active) clip — every neighbouring tile is also
  // partly visible at 0.3 threshold, so the previous IntersectionObserver
  // approach played several clips at once instead of just the one the
  // customer is actually looking at. Tied directly to `index` instead: only
  // `videoRefs.current[index]` ever plays, and it starts automatically the
  // moment it becomes centred (auto-advance or a manual prev/next click),
  // exactly mirroring the `isActive` scale-up already driving the visual
  // state below. Still gated on the whole carousel being on screen at all,
  // so an off-screen strip doesn't decode video in the background. Never
  // unmuted — autoplay with sound is both hostile and blocked by browsers.
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const root = viewportRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (count === 0) return;
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      video.muted = true;
      if (inView && i === index) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [index, count, inView]);

  // Nothing to show on a fresh install where no product has a video yet.
  if (count === 0) return null;

  // Centre the active slide in the viewport.
  const offset = index * STEP - (viewportWidth - SLIDE_WIDTH) / 2;
  const tripled = [...slides, ...slides, ...slides];

  return (
    <section
      ref={revealRef}
      aria-label="Product videos"
      className={`home-block mx-auto ${revealClass}`}
    >
      <div
        className="relative"
        aria-roledescription="carousel"
        aria-label="Product videos"
      >
        <div ref={viewportRef} className="overflow-hidden py-[70px]">
          <div
            className="flex items-center will-change-transform"
            style={{
              gap: `${GAP}px`,
              transform: `translate3d(${-offset}px, 0, 0)`,
              transition: animate
                ? `transform ${DURATION}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
                : "none",
            }}
          >
            {tripled.map((slide, i) => {
              const isActive = i === index;
              return (
                <article
                  key={`${i}-${slide.key}`}
                  aria-hidden={i === index ? undefined : true}
                  style={{ width: SLIDE_WIDTH }}
                  className={`shrink-0 overflow-hidden rounded-[10px] bg-white shadow-[0_10px_30px_rgba(31,26,20,0.10)] transition-[transform,opacity] duration-500 ease-out ${
                    isActive
                      ? "z-10 scale-100 opacity-100"
                      : "scale-[0.82] opacity-70"
                  }`}
                >
                  <video
                    ref={(el) => {
                      videoRefs.current[i] = el;
                    }}
                    src={slide.videoUrl}
                    poster={slide.thumb || undefined}
                    muted
                    playsInline
                    preload="metadata"
                    className="block aspect-[3/4] w-full bg-[#f5f2ee] object-cover"
                  />
                  <Link
                    href={`/product/${slide.slug}`}
                    tabIndex={isActive ? undefined : -1}
                    className="grid grid-cols-[64px_1fr] items-center gap-3 bg-white p-3 text-ink"
                  >
                    <span className="relative block h-16 w-16 overflow-hidden bg-[#f5f2ee]">
                      {slide.thumb && (
                        <Image
                          src={slide.thumb}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span className="grid min-w-0 gap-1">
                      <span className="truncate text-[13px] text-ink">
                        {slide.name}
                      </span>
                      <span className="font-ui text-[12px] font-light tracking-[0.12px] text-[#5f5a54]">
                        {slide.price}
                      </span>
                    </span>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>

        <button
          aria-label="Previous video"
          onClick={() => setIndex((i) => i - 1)}
          className="absolute left-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(31,26,20,0.18)] transition-colors hover:bg-[#f5f2ee] hover:text-gold sm:flex"
        >
          <ChevronLeftIcon size={16} />
        </button>
        <button
          aria-label="Next video"
          onClick={() => setIndex((i) => i + 1)}
          className="absolute right-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(31,26,20,0.18)] transition-colors hover:bg-[#f5f2ee] hover:text-gold sm:flex"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </section>
  );
}
