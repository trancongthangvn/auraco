"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { journalPosts } from "@/data/site";
import { ArrowRightIcon } from "@/components/icons";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";

/** Must match the strip's own gap between cards, in px. */
const JOURNAL_GAP = 17;
/** Slide transition, in ms — must match the `duration-[520ms]` class below. */
const JOURNAL_DURATION = 520;

export default function Journal() {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>({ fadeOnly: true });
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const dragLockedRef = useRef(false);

  // Driven by an index into a TRIPLED post list and moved with a CSS
  // transform, not by scrolling — explicit request: the first post must
  // appear to continue right after the last one (and vice versa) when the
  // arrows are clicked, not jump-cut back to the start. A scrollTo-based
  // wrap (the previous approach) visibly slides backwards across the whole
  // strip instead of continuing forward, which reads as a glitch, not a
  // loop. A transform wrap is deterministic: once the strip settles onto
  // the adjacent copy, the index snaps back into the middle copy with the
  // transition switched off for one tick, which the eye never catches —
  // same pattern as ProductCarousel.tsx.
  const count = journalPosts.length;
  const [index, setIndex] = useState(count);
  // Starts false, not true: the very first paint happens before the
  // ResizeObserver below has measured the real viewport width, so the
  // initial `offset` is computed from cardWidth=0 (wrong). Animating that
  // first correction to the real offset is what let the strip visibly get
  // stuck mid-slide, showing a sliver of the neighboring card instead of a
  // clean two-up layout. Keeping the transition off until the existing
  // "re-enable after a tick" effect below turns it back on means that
  // first correction snaps instantly instead of animating — the same
  // fix already used for the wrap-around snap further down.
  const [animate, setAnimate] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  // The 1-up/2-up breakpoint here is Tailwind's stock `sm:` (640px), matching
  // the grid classes this replaced (`auto-cols-[100%] sm:auto-cols-[calc(50%-8.5px)]`).
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const sync = () => setViewportWidth(el.clientWidth);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setWindowWidth(window.innerWidth);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const isTwoUp = windowWidth >= 640;
  const cardWidth =
    viewportWidth > 0
      ? isTwoUp
        ? (viewportWidth - JOURNAL_GAP) / 2
        : viewportWidth
      : 0;
  const step = cardWidth + JOURNAL_GAP;
  const offset = index * step;

  // Snap back into the middle copy whenever the index leaves it, so the
  // strip can be stepped through forever in either direction.
  useEffect(() => {
    if (count === 0) return;
    if (index >= count * 2 || index < count) {
      const id = setTimeout(() => {
        setAnimate(false);
        setIndex((i) => (i >= count * 2 ? i - count : i + count));
      }, JOURNAL_DURATION);
      return () => clearTimeout(id);
    }
  }, [index, count]);

  // Re-enable the transition on the tick after a wrap.
  useEffect(() => {
    if (animate) return;
    const id = setTimeout(() => setAnimate(true), 20);
    return () => clearTimeout(id);
  }, [animate]);

  const step1 = (dir: 1 | -1) => setIndex((i) => i + dir);
  const goTo = (i: number) => setIndex(count + i);
  const active = ((index % count) + count) % count;

  // Touch-swipe support — the reference's own Journal slider
  // (`.home-journal-slider`) IS swipeable (confirmed live: dispatching a
  // touch drag on its `[data-slider-viewport]` moves its track), this
  // component just never had the handlers wired despite already having
  // working arrows/dots. Same detection logic as Hero.tsx/ProductCarousel.tsx.
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
        step1(1);
      } else {
        step1(-1);
      }
    }
    dragLockedRef.current = false;
  };

  // React attaches its synthetic `touchmove` as a passive listener, so
  // `preventDefault()` from a JSX `onTouchMove` handler is silently
  // ignored — attaching the listener manually with `{ passive: false }` is
  // what actually lets the horizontal swipe lock out the browser's own
  // edge-navigation gesture instead of dragging the page frame with it
  // (same fix applied to Hero.tsx/ProductCarousel.tsx/Testimonials.tsx).
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

  return (
    <section
      ref={revealRef}
      className={`home-block mx-auto ${revealClass}`}
    >
      <div>
        {/* The reference keeps a "View more" link in this row's markup but
            hides it at every breakpoint (display: none) — dead markup, so
            the heading just centers on its own. */}
        <div className="mb-4 text-center">
          <h2 className="font-serif-display text-[clamp(1.85rem,4vw,2.35rem)] font-bold text-[#2b261f]">
            Journal
          </h2>
        </div>
        <div className="relative">
          <div
            ref={viewportRef}
            // Invisible (not just un-animated) until the ResizeObserver
            // above has measured a real width: with cardWidth still 0 on
            // the very first paint, `offset` briefly targets the wrong
            // position, and that first frame is fast but not instant —
            // long enough to actually show a sliver of the neighboring
            // card before the correct offset lands. Hiding the strip for
            // that one measurement cycle means nothing wrong ever paints,
            // rather than merely skipping the animation into it.
            className={`touch-pan-y overflow-hidden ${viewportWidth > 0 ? "" : "invisible"}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              // items-stretch (the flex default, stated explicitly here so
              // it isn't lost to a future edit) — every card in a row must
              // share one height regardless of how many lines its own title
              // wraps to. `items-start` let each card size to its own
              // content instead, so a 1-line title produced a visibly
              // shorter card than a neighboring 2-line one.
              className={`flex items-stretch ${
                animate
                  ? "transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  : ""
              }`}
              style={{
                gap: `${JOURNAL_GAP}px`,
                transform: `translate3d(${-offset}px, 0, 0)`,
              }}
            >
              {[0, 1, 2].flatMap((copy) =>
                journalPosts.map((post) => (
                  <Link
                    key={`${copy}-${post.slug}`}
                    aria-hidden={copy === 1 ? undefined : true}
                    href={`/news/${post.slug}`}
                    // `h-full` (percentage height) fought align-items:stretch
                    // here — the track div's own height is intrinsic
                    // (content-based, no explicit height), so `height:100%`
                    // resolves inconsistently instead of letting stretch
                    // equalize the row; dropping it lets stretch alone size
                    // every card to the tallest one, as intended.
                    className="group flex shrink-0 flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_18px_40px_rgba(43,38,31,0.08)]"
                    style={{ width: `${cardWidth}px` }}
                  >
                    <div className="relative h-[350px] overflow-hidden lg:h-[650px]">
                      <Image
                        src={post.img}
                        alt={post.title}
                        fill
                        sizes="(min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-1 flex-col pb-[18.4px] pl-[17.6px] pr-[17.6px] pt-[16px]">
                      <p className="font-ui mb-[5.6px] text-[10px] font-light leading-[15.5px] text-[rgba(40,36,31,0.52)]">{post.date}</p>
                      <h3 className="font-serif-display mb-[7.2px] line-clamp-2 text-[19.2px] font-bold leading-[29.76px] text-[#2b261f]">
                        {post.title}
                      </h3>
                      <p className="font-ui mb-[10.4px] line-clamp-2 text-[12px] font-light leading-[18.6px] text-[#625d56]">
                        {post.excerpt}
                      </p>
                      <span className="font-ui mt-auto inline-flex items-center gap-1.5 self-start text-[11px] font-normal uppercase leading-[17.05px] tracking-wide text-[#8d6a37] transition-[gap,color] duration-300 hover:gap-3 hover:text-ink">
                        READ MORE <ArrowRightIcon size={13} />
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {journalPosts.length > 2 && (
            <>
              {/* The reference draws these as the literal ❮ / ❯ glyphs, not
                  SVG chevrons — matching it exactly here too. */}
              <button
                aria-label="Previous journal posts"
                onClick={() => step1(-1)}
                className="hidden sm:flex absolute -left-5 top-[calc(37.5%-18px)] z-20 items-center justify-center h-9 w-9 rounded-full bg-white text-[17.6px] leading-none shadow transition-colors hover:bg-[#f5f2ee] hover:text-gold"
              >
                &#10094;
              </button>
              <button
                aria-label="Next journal posts"
                onClick={() => step1(1)}
                className="hidden sm:flex absolute -right-5 top-[calc(37.5%-18px)] z-20 items-center justify-center h-9 w-9 rounded-full bg-white text-[17.6px] leading-none shadow transition-colors hover:bg-[#f5f2ee] hover:text-gold"
              >
                &#10095;
              </button>
            </>
          )}

          {journalPosts.length > 1 && (
            // Explicit request: separate the dots from the cards clearly at
            // every screen size, scaling with viewport width rather than a
            // fixed px value. Verified with getBoundingClientRect that the
            // clamp() floor is a real, present gap even at 375px — a
            // smaller floor (20px) still read as "touching" because the
            // cards' own box-shadow (0 18px 40px) visually bleeds into it;
            // this floor is wide enough to sit clearly past that falloff.
            <div className="mt-[clamp(28px,2.5vw,40px)] flex items-center justify-center gap-[7.2px]">
              {journalPosts.map((post, i) => (
                <button
                  key={post.slug}
                  type="button"
                  aria-label={`Go to ${post.title}`}
                  onClick={() => goTo(i)}
                  className={`h-[8.8px] w-[8.8px] rounded-full bg-[#a67c3d] transition-opacity ${
                    i === active ? "opacity-100" : "opacity-[0.28]"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
