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
 * Advance is driven by the active clip's own `ended` event, not a timer — a
 * fixed interval would cut a slow clip short or leave a dead pause after a
 * quick one. That means the video must NOT loop (a looping `<video>` never
 * fires `ended`), so each clip plays exactly once before the strip steps to
 * the next.
 */

const SLIDE_WIDTH = 300;
const GAP = 24;
const STEP = SLIDE_WIDTH + GAP;
const DURATION = 520;

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
  const { currency } = useCurrency();
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
          price: formatPrice(p.price, currency),
          thumb: p.images[0] ?? "",
          // `#t=0.1` makes the browser paint the first frame as a poster
          // before playback starts — without it the tile is a black box.
          videoUrl: `${p.videoUrl as string}#t=0.1`,
        })),
    [products, currency]
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

  // Step to the next clip when the active one finishes playing — see the
  // file-level comment on why this listens for `ended` instead of running a
  // fixed-interval timer. `videoRefs` holds a stable per-slot DOM reference
  // (the tripled list's membership never changes, only which slot is
  // active), so `videoRefs.current[index]` is always the one actually
  // playing right now.
  useEffect(() => {
    const video = videoRefs.current[index];
    if (!video) return;
    const onEnded = () => setIndex((i) => i + 1);
    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, [index]);

  // Play the muted clips only while they are on screen, so an off-screen strip
  // never decodes video in the background. Never unmuted — autoplay with sound
  // is both hostile and blocked by browsers. Not gated on
  // prefers-reduced-motion: the shop owner runs with it on and still wants the
  // clips, and every tile carries a poster so a blocked play() is invisible.
  useEffect(() => {
    const root = viewportRef.current;
    if (!root || count === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          video.muted = true;
          if (entry.isIntersecting) {
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.3 }
    );

    root.querySelectorAll("video").forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, [count]);

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
                      <span className="font-serif-display line-clamp-2 text-[16px] font-normal leading-[20px] text-[#28241f]">
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
          className="absolute left-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(31,26,20,0.18)] sm:flex"
        >
          <ChevronLeftIcon size={16} />
        </button>
        <button
          aria-label="Next video"
          onClick={() => setIndex((i) => i + 1)}
          className="absolute right-1 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(31,26,20,0.18)] sm:flex"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </section>
  );
}
