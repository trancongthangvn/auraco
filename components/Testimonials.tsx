"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";
import { VerifiedBadgeIcon } from "@/components/icons";

export type Testimonial = {
  initials: string;
  name: string;
  date: string;
  quote: string;
  photo?: string;
};

/** Mobile card width + gap, in px — must match the `w-[220px]` card and the
 *  strip's `gap-[7px]`, since the swipe step is measured in real pixels
 *  (not viewport percentages) to preserve the "peek of the next card" look
 *  the static row already has below `sm:`. */
const CARD_WIDTH = 220;
const CARD_GAP = 7;
const STEP = CARD_WIDTH + CARD_GAP;
/** Slide transition, in ms — must match the `duration-[420ms]` class below. */
const TESTIMONIALS_DURATION = 420;
/** Auto-advance interval, in ms — matches the reference's own
 *  `data-slide-interval="5000"` on `.home-review-slider` for this exact
 *  section, measured directly on auracojewelry.com. */
const TESTIMONIALS_AUTOPLAY = 5000;

/** Star row, drawn to the reference's `.home-feedback-card__stars` spec:
 *  12px glyphs on a 24 viewBox with a 1.5px stroke in the fill colour and a
 *  0.8px gap, lit ones #f0b429 against #e0d5c0 for the rest. The stroke is
 *  what gives them their weight — without it they read thin and small. */
function Stars({ filled = 5 }: { filled?: number }) {
  return (
    <span className="flex items-center justify-center gap-[0.8px]" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={i < filled ? "text-black" : "text-[#e0d5c0]"}
        >
          <path
            d="M12 2l2.95 6.6 7.05.7-5.3 4.92 1.55 7.18L12 17.85 5.75 21.4 7.3 14.22 2 9.3l7.05-.7L12 2z"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

function TestimonialCard({ t, ariaHidden }: { t: Testimonial; ariaHidden?: true }) {
  return (
    <div
      aria-hidden={ariaHidden}
      // Desktop card sizing: explicit request to fit exactly 5 cards per row
      // instead of however many happen to exist (was `flex-1 basis-0`, which
      // divides the row evenly across ALL testimonials — 6 cards fit exactly
      // because there were 6 in the data). `basis-[calc((100%-28px)/5)]`
      // (28px = 4 × the row's 7px gap) sizes every card for a fixed 5-across
      // layout; a 6th+ testimonial now overflows into the same
      // `overflow-x-auto` scroll the row already had, rather than shrinking
      // every card to fit. Measured live at 1217px row width: this took the
      // card from 197px to ~238px wide, a ~20% increase, matching the
      // explicit width request precisely (the two asks were confirmed as the
      // same change, described two ways).
      className="flex w-[220px] shrink-0 flex-col overflow-hidden rounded-lg bg-white text-center shadow-[0_4px_16px_rgba(31,26,20,0.06)] sm:w-auto sm:shrink-0 sm:grow-0 sm:basis-[calc((100%-28px)/5)]"
    >
      {/* Square photo, as on the reference. A testimonial saved without one
          falls back to the tinted box.
          Desktop-only ratio change (mobile keeps aspect-[12/25] via the
          `sm:` override below): the text block beneath (name/date/quote/
          stars) has a fixed height from fixed font sizes and paddings, so it
          doesn't shrink with the card. To bring the WHOLE card down to 75%
          of its old height (576.6px → ~432.5px, measured live) while the
          photo itself gets proportionally wider from the width change above,
          the photo needs a shorter ratio, not the same 12/25 scaled up —
          aspect-[8/9] was solved from those two measured numbers
          (photo height = 0.75 × old total − the fixed text-block height). */}
      <div className="relative aspect-[12/25] w-full bg-[#e9e4dc] sm:aspect-[8/9]">
        {t.photo && (
          <Image
            src={t.photo}
            alt={t.name}
            fill
            sizes="(min-width: 640px) 17vw, 220px"
            className="object-cover"
          />
        )}
        <span className="absolute -bottom-[0.825rem] left-1/2 z-10 flex h-[1.65rem] w-[1.65rem] -translate-x-1/2 items-center justify-center rounded-full bg-[#ece9e4] text-[0.65rem] font-bold tracking-[0.02em] text-[#1f1a14] shadow-[0_1px_4px_rgba(31,26,20,0.08)]">
          {t.initials}
          <VerifiedBadgeIcon
            size={14}
            className="absolute -bottom-[1px] -right-[3px] drop-shadow-[0_1px_2px_rgba(31,26,20,0.25)]"
          />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-[3.2px] pb-[11.2px] pl-[9.6px] pr-[9.6px] pt-[19.2px]">
        <p className="font-ui text-[12px] font-medium leading-[15.6px] text-[#28241f]">{t.name}</p>
        <p className="font-ui text-[10px] font-light leading-[15.5px] tracking-[0.02em] text-[rgba(40,36,31,0.45)]">
          {t.date}
        </p>
        {/* Four-line clamp, matching the reference, so a long quote can
            never push the star row out of line across the row. */}
        <p className="font-ui line-clamp-4 text-[11px] font-light leading-[1.55] tracking-[0.005em] text-[#4f4a44]">
          {t.quote}
        </p>
        <span className="mt-auto flex h-[27px] items-center justify-center">
          <Stars />
        </span>
      </div>
    </div>
  );
}

/**
 * Customer feedback cards.
 *
 * Desktop (`sm:` / 640px and up) stays exactly the prior explicit request:
 * a fully static flat row, no carousel UI at all — no arrows, no dots, no
 * auto-advance, just incidental `overflow-x-auto` touch-scroll.
 *
 * Mobile (below `sm:`) is a separate, later request: dot pagination, real
 * touch-swipe, and a seamless infinite loop ("vòng lặp vô hạn, ảnh trước
 * liền ảnh sau") — the same tripled-list transform pattern used by
 * Journal.tsx / Hero.tsx, with Hero's touch-swipe handlers. The two
 * breakpoints render genuinely different DOM (one `sm:hidden` block, one
 * `hidden sm:flex` block), the same split Gallery.tsx uses for its own
 * mobile/desktop layouts, rather than forcing one structure to serve both.
 */
export default function Testimonials({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();

  const count = testimonials.length;
  const [index, setIndex] = useState(count);
  const [animate, setAnimate] = useState(true);
  const touchStart = useRef({ x: 0, y: 0 });
  const dragLockedRef = useRef(false);
  const mobileViewportRef = useRef<HTMLDivElement>(null);

  const prev = () => setIndex((i) => i - 1);
  const next = () => setIndex((i) => i + 1);

  // Snap back into the middle copy whenever the index drifts into the first
  // or third copy, so the strip can be swiped through forever in either
  // direction — same pattern as Journal.tsx / Hero.tsx.
  useEffect(() => {
    if (count === 0) return;
    if (index >= count * 2 || index < count) {
      const id = setTimeout(() => {
        setAnimate(false);
        setIndex((i) => (i >= count * 2 ? i - count : i + count));
      }, TESTIMONIALS_DURATION);
      return () => clearTimeout(id);
    }
  }, [index, count]);

  // Re-enable the transition on the tick after a wrap.
  useEffect(() => {
    if (animate) return;
    const id = setTimeout(() => setAnimate(true), 20);
    return () => clearTimeout(id);
  }, [animate]);

  // Auto-advance every 5s, mobile only (the carousel strip this drives
  // doesn't exist on desktop). Keyed off `index` itself, matching
  // Hero.tsx/Gallery.tsx's own auto-advance — a manual swipe or dot click
  // changes `index`, which tears down this effect and reschedules a fresh
  // 5s window from wherever the customer just jumped to, instead of racing
  // an in-flight timer.
  useEffect(() => {
    if (count <= 1) return;
    const id = setTimeout(() => {
      setIndex((i) => i + 1);
    }, TESTIMONIALS_AUTOPLAY);
    return () => clearTimeout(id);
  }, [index, count]);

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
  // strip instead of letting the browser's own page-drag take over.
  useEffect(() => {
    const el = mobileViewportRef.current;
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

  const active = count === 0 ? 0 : ((index % count) + count) % count;
  const offset = index * STEP;

  return (
    <section
      ref={revealRef}
      className={`home-block mx-auto ${revealClass}`}
    >
      <div>
        <h2 className="font-serif-display section-title">Feedback</h2>

        {/* Mobile only (below sm:) — swipeable, infinite-loop strip with
            dot pagination. Desktop has no carousel UI per the standing
            desktop requirement. */}
        <div className="sm:hidden">
          <div
            ref={mobileViewportRef}
            className="touch-pan-y overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className={`flex ${
                animate
                  ? "transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  : ""
              }`}
              style={{
                gap: `${CARD_GAP}px`,
                transform: `translate3d(${-offset}px, 0, 0)`,
              }}
            >
              {count > 0 &&
                [0, 1, 2].flatMap((copy) =>
                  testimonials.map((t, i) => (
                    <TestimonialCard
                      key={`${copy}-${t.name}-${t.date}-${i}`}
                      t={t}
                      ariaHidden={copy === 1 ? undefined : true}
                    />
                  ))
                )}
            </div>
          </div>

          {count > 1 && (
            <div className="mt-[18px] flex items-center justify-center gap-[7.2px]">
              {testimonials.map((t, i) => (
                <button
                  key={t.name + t.date}
                  type="button"
                  aria-label={`Go to testimonial from ${t.name}`}
                  onClick={() => setIndex(count + i)}
                  className={`h-[8.8px] w-[8.8px] rounded-full bg-[#a67c3d] transition-opacity ${
                    i === active ? "opacity-100" : "opacity-[0.28]"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop (sm: and up) — unchanged static flat row, no carousel
            machinery of any kind. */}
        <div className="hidden gap-[7px] overflow-x-auto pb-2 sm:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {testimonials.map((t) => (
            <TestimonialCard key={t.name + t.date} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
