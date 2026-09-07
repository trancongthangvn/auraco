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
/** How much of the neighbouring slide should stay visibly peeking on each
 *  side on a narrow (mobile) screen, in px, once the GAP between slides is
 *  accounted for. Explicit follow-up request: a plain percentage-of-viewport
 *  margin (the first version of this fix) silently let GAP eat into the
 *  margin before any of the neighbour itself was visible — at a 327px
 *  viewport it worked out to margin=32.7px, of which 24px was just the GAP,
 *  leaving under 9px of the actual neighbouring photo showing, imperceptible
 *  on a real screen. Solving for the margin the OTHER way (GAP + this
 *  constant) guarantees a real, fixed-size sliver of the neighbour shows
 *  regardless of viewport width, rather than a percentage that happens to
 *  mostly get consumed by the gap. */
const MOBILE_PEEK = 56;
/** Floor so a very narrow viewport can't shrink the active slide below a
 *  readable width. */
const MIN_SLIDE_WIDTH = 160;
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
  // Touch-swipe support — explicit request, mobile had no way to move
  // between videos besides waiting for auto-advance (arrows are desktop
  // only, see hidden sm:flex below). Same detection logic/thresholds as
  // Journal.tsx/Hero.tsx/ProductCarousel.tsx.
  const touchStart = useRef({ x: 0, y: 0 });
  const dragLockedRef = useRef(false);
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
    // Measure synchronously on mount instead of waiting on the observer's
    // own first callback — found while testing the mobile peek fix below:
    // ResizeObserver's initial callback did not fire at all in more than
    // one automated/embedded browser context tried here, which would have
    // silently left `viewportWidth` at its 0 default (and so `slideWidth`
    // stuck at the full 300px fallback, exactly the "no peek" symptom
    // reported). A plain getBoundingClientRect() read has no such
    // dependency, so the correct width is available from the very first
    // render that matters; the observer still covers real width changes
    // afterward (a resize or orientation change).
    setViewportWidth(el.getBoundingClientRect().width);
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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    dragLockedRef.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.changedTouches[0];
    const deltaX = t.clientX - touchStart.current.x;
    const deltaY = t.clientY - touchStart.current.y;
    const SWIPE_THRESHOLD = 45;

    if (
      Math.abs(deltaX) > SWIPE_THRESHOLD &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      if (deltaX < 0) {
        setIndex((i) => i + 1);
      } else {
        setIndex((i) => i - 1);
      }
    }
    dragLockedRef.current = false;
  };

  // React attaches its synthetic `touchmove` as a passive listener, so
  // `preventDefault()` from a JSX `onTouchMove` handler is silently
  // ignored — attaching the listener manually with `{ passive: false }` is
  // what actually lets the horizontal swipe lock out the browser's own
  // edge-navigation gesture instead of dragging the page frame with it
  // (same fix applied to Hero.tsx/Journal.tsx/ProductCarousel.tsx/Testimonials.tsx).
  useEffect(() => {
    const el = viewportRef.current;
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
  }, []);

  // Nothing to show on a fresh install where no product has a video yet.
  if (count === 0) return null;

  // Centre the active slide in the viewport.
  const slideWidth =
    viewportWidth > 0
      ? Math.min(SLIDE_WIDTH, Math.max(MIN_SLIDE_WIDTH, viewportWidth - 2 * (GAP + MOBILE_PEEK)))
      : SLIDE_WIDTH;
  const step = slideWidth + GAP;
  const offset = index * step - (viewportWidth - slideWidth) / 2;
  const tripled = [...slides, ...slides, ...slides];
  const active = ((index % count) + count) % count;
  const goTo = (i: number) => setIndex(count + i);

  return (
    <section
      ref={revealRef}
      aria-label="Product videos"
      className={`home-block mx-auto ${revealClass}`}
    >
      {/* Explicit request: this section had no heading at all, unlike every
          other home-block band (Journal, Feedback, ...) — .section-title is
          the same shared heading treatment those already use. */}
      <h2 className="font-serif-display section-title">Inspiration Station</h2>
      <div
        className="relative"
        aria-roledescription="carousel"
        aria-label="Product videos"
      >
        <div
          ref={viewportRef}
          className="touch-pan-y overflow-hidden py-[70px]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
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
                  style={{ width: slideWidth }}
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

        {/* hidden sm:flex: explicit follow-up request to remove these on
            mobile again (replaced by the dot pagination below the card)
            — reverses the earlier "show on mobile too" change. Desktop
            keeps them. */}
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

      {/* Mobile-only dot pagination — explicit follow-up request to move
          this below the whole card instead of overlaid on the video
          itself (the first version, matching Journal.tsx's own overlay
          style, covered part of the clip — this carousel's own reference
          wanted it clear of the video entirely). Plain flow, not absolute,
          so it just sits under the track like Journal's dots did before
          THEIR overlay request — the two carousels ended up wanting
          opposite treatments, which is why they now differ. */}
      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-[7.2px] sm:hidden">
          {slides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              aria-label={`Go to ${slide.name}`}
              onClick={() => goTo(i)}
              className={`h-[8.8px] w-[8.8px] rounded-full bg-[#a67c3d] transition-opacity ${
                i === active ? "opacity-100" : "opacity-[0.28]"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
