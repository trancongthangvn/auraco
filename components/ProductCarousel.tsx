"use client";

import { useEffect, useRef, useState } from "react";

/** Gap between carousel cards, in px — must match the `gap-6` class below. */
const CAROUSEL_GAP = 24;
/** Card width, in px — must match the `w-[320px]` class below. */
const CAROUSEL_CARD = 320;
/** Slide transition, in ms — must match the `duration-[520ms]` class below. */
const CAROUSEL_DURATION = 520;
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/site";
import { ChevronLeftIcon, ChevronRightIcon, StarRating } from "@/components/icons";
import AddToBagButton from "@/components/AddToBagButton";
import CategoryFeature from "@/components/CategoryFeature";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatPrice } from "@/lib/currency";

export default function ProductCarousel({
  title,
  subtitle,
  products,
  layout = "carousel",
  feature,
  centerTitle = false,
  boxCard = true,
  showNav = true,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
  /** Optional collection banner shown between the heading and the products,
   *  as the reference site does under NEW ARRIVALS. */
  feature?: {
    href: string;
    title: string;
    description: string;
    image: string;
  };
  /** "grid" lays every product out in a fixed, evenly-spaced 3-column grid
   *  (2 rows for 6 products) that fills the section width and reflows with
   *  it, instead of the default horizontal scroll-with-arrows carousel. */
  layout?: "carousel" | "grid";
  /** Centers the heading and matches the reference's plain, non-uppercase
   *  "Best sellers" title on the cart page — distinct from `.section-title`,
   *  which forces uppercase and doesn't fit a mixed-case heading. */
  centerTitle?: boolean;
  /** The reference wraps homepage sections in a white rounded shadow card
   *  (`.home-block`), but its cart-page "Best sellers" rail sits flat on
   *  the page with no box at all — set false there. */
  boxCard?: boolean;
  /** Hides the prev/next arrows and the dot row, leaving a touch/drag-only
   *  strip. The reference itself keeps these on every carousel instance
   *  (including New Arrivals), but the New Arrivals call on the homepage
   *  is set false here on explicit request, overriding that match. */
  showNav?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();
  const { currency, rates } = useCurrency();
  const touchStart = useRef({ x: 0, y: 0 });
  const dragLockedRef = useRef(false);

  // The strip is driven by an index into a tripled product list and moved
  // with a CSS transform, not by scrolling. Scroll-based looping fought the
  // browser's own smooth-scroll animation (it kept driving towards a position
  // the loop had already shifted, so the strip walked to the end and stuck).
  // A transform is deterministic: the wrap is a single jump with the
  // transition switched off for one tick, which the eye never catches.
  const count = products.length;
  const [index, setIndex] = useState(count);
  const [animate, setAnimate] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(0);
  // The tablet card-count breakpoint below has to key off the actual
  // viewport (window) width, not this container's clientWidth — the
  // section's own padding shrinks the container below 768px well before the
  // window itself crosses that line, so a container-width check missed the
  // whole tablet range.
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

  // Snap back into the middle copy whenever the index leaves it, so the list
  // can be stepped through forever in either direction.
  useEffect(() => {
    if (count === 0) return;
    if (index >= count * 2 || index < count) {
      const id = setTimeout(() => {
        setAnimate(false);
        setIndex((i) => (i >= count * 2 ? i - count : i + count));
      }, CAROUSEL_DURATION);
      return () => clearTimeout(id);
    }
  }, [index, count]);

  // Re-enable the transition on the tick after a wrap.
  useEffect(() => {
    if (animate) return;
    const id = setTimeout(() => setAnimate(true), 20);
    return () => clearTimeout(id);
  }, [animate]);

  // Below desktop (mobile AND tablet) gets exactly two cards per view
  // instead of the desktop's fixed 320px card — measured directly against
  // the reference at both a phone width (390px: ~171-176px cards, third
  // barely a 1px sliver) and tablet width, both showing the same "exactly
  // two, no meaningful peek" pattern; only ≥1024px keeps the fixed 320px
  // card with its intentional third-card peek.
  const isTabletWidth = windowWidth > 0 && windowWidth < 1024;
  const cardWidth =
    isTabletWidth && viewportWidth > 0
      ? (viewportWidth - CAROUSEL_GAP) / 2
      : CAROUSEL_CARD;

  const step = cardWidth + CAROUSEL_GAP;
  // Desktop centers the active card (deliberate peek of a neighbour on both
  // sides). The two-card mode instead start-aligns card `index` flush with
  // the left edge — centering there produced a symmetric peek on BOTH
  // sides (measured: card 1 clipped at x=-4, card 3's sliver 28px wide),
  // when the reference shows the first card flush left with only a ~7px
  // sliver of a third card on the right, nothing on the left.
  const offset = isTabletWidth
    ? index * step
    : index * step - (viewportWidth - cardWidth) / 2;

  const scrollBy = (dir: 1 | -1) => setIndex((i) => i + dir);

  // Touch-swipe support for the carousel strip, matching Hero.tsx's
  // detection logic: track the touch start point, then on touch-end compare
  // deltaX/deltaY to require a horizontal-dominant gesture past a ~45px
  // threshold before treating it as a swipe (so a vertical page scroll that
  // starts over the carousel doesn't get misread as a slide change).
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    dragLockedRef.current = false;
  };

  // React attaches its synthetic `touchmove` as a passive listener (for
  // scroll-perf reasons), so `preventDefault()` from a JSX `onTouchMove`
  // handler is silently ignored — this is why swiping could still visibly
  // drag the whole page frame sideways mid-gesture even with touch-pan-y
  // set (that only hints the browser about *scroll* ownership, not its own
  // edge-navigation gesture). Attaching the listener manually with
  // `{ passive: false }` is the only way `preventDefault()` actually takes
  // effect once horizontal intent is clear, locking the gesture to this
  // carousel instead of letting the browser's own page-drag take over.
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
        scrollBy(1);
      } else {
        scrollBy(-1);
      }
    }
    dragLockedRef.current = false;
  };

  // In carousel mode each tile is a distinct white card (rounded, shadowed),
  // so the row reads as separate panels rather than a continuous band — the
  // same treatment the video strip below it uses.
  const boxed = layout === "carousel";

  // `Product` (data/site.ts) only carries `href` — every caller here points
  // it at a product page, so the slug is just its last path segment.
  const slugFromHref = (href: string) => href.split("/").filter(Boolean).pop() || "";

  const card = (p: Product) => (
    <Link
      href={p.href}
      className="group relative block"
    >
      {/* A product saved without any image gives an empty src, which
          renders as a broken image icon — fall back to the tinted box. */}
      <div className="relative aspect-square overflow-hidden bg-[#f5f2ee] mb-3">
        {p.badgeLabel && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-[#111] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.04em] text-white">
            {p.badgeLabel}
          </span>
        )}
        {p.img && (
          <Image
            src={p.img}
            alt={p.name}
            fill
            sizes={layout === "grid" ? "(min-width: 640px) 33vw, 50vw" : "320px"}
            className={`object-cover transition-[opacity,transform] duration-[900ms] ${
              p.hoverImg
                ? "group-hover:opacity-0"
                : "group-hover:scale-105"
            }`}
          />
        )}
        {/* On-model shot revealed on hover, matching the catalog cards
            (slowed from 500ms — felt jarring at that speed). */}
        {p.hoverImg && (
          <Image
            src={p.hoverImg}
            alt=""
            fill
            sizes={layout === "grid" ? "(min-width: 640px) 33vw, 50vw" : "320px"}
            className="object-cover opacity-0 transition-opacity duration-[900ms] group-hover:opacity-100"
          />
        )}
        <AddToBagButton
          item={{
            slug: slugFromHref(p.href),
            name: p.name,
            price: p.priceValue ?? (Number(p.price.replace(/[^0-9.]/g, "")) || 0),
            image: p.img ?? null,
            material: p.material,
          }}
        />
      </div>
      <div>
        <p className="mb-1 flex items-center"><StarRating rating={p.rating} size={16} /></p>
        {/* Two reserved lines keep material and price aligned across the row. */}
        <h3 className="font-serif-display mb-1 line-clamp-2 min-h-[30px] text-[20px] font-normal leading-[23px] text-[#28241f]">
          {p.name}
        </h3>
        <p className="font-ui mb-1 text-[12px] font-normal leading-[16.8px] tracking-[0.12px] text-[#5f5a54]">
          {p.material}
        </p>
        <p className="font-ui text-[12px] font-light tracking-[0.12px] text-[#5f5a54]">
          {p.priceValue !== undefined
            ? formatPrice(p.priceValue, currency, rates[currency])
            : p.price}
        </p>
      </div>
    </Link>
  );

  return (
    <section ref={revealRef} className={`${boxCard ? "home-block" : ""} mx-auto ${revealClass}`}>
      <div>
      {/* An empty title means the section is headed by something else.
          Carousel sections (Best Sellers / You May Also Like) get a plain
          left-aligned heading — no card chrome around them either, just
          image + caption butted together — rather than the centered,
          uppercase section-title band used on homepage grid sections. */}
      {(title || subtitle) && (
        <div className={centerTitle || !boxed ? "text-center mb-5" : "mb-5 flex items-baseline justify-between"}>
          {title && (
            <h2
              className={
                centerTitle
                  ? "font-serif-display text-[25.6px] font-normal text-[#28241f]"
                  : boxed
                    ? "font-serif-display text-[22px] font-normal text-[#28241f]"
                    : "font-serif-display section-title"
              }
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-black/60 max-w-xl mx-auto">{subtitle}</p>
          )}
        </div>
      )}


      {feature && (
        <div className="mb-6">
          <CategoryFeature {...feature} />
        </div>
      )}

      {layout === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
          {products.map((p) => (
            <div key={p.name}>{card(p)}</div>
          ))}
        </div>
      ) : (
        <div className="relative">
          <div
            ref={viewportRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            // touch-pan-y tells the browser this element handles horizontal
            // gestures itself — without it a full-width swipe can get
            // claimed mid-gesture by the browser's own edge-swipe/back
            // navigation instead of driving the strip (same fix as
            // Hero.tsx's swipe handling).
            className="touch-pan-y overflow-hidden py-6"
          >
            <div
              className={`flex items-start gap-6 ${
                animate
                  ? "transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  : ""
              }`}
              style={{ transform: `translate3d(${-offset}px, 0, 0)` }}
            >
              {[0, 1, 2].flatMap((copy) =>
                products.map((p) => (
                  <div
                    key={`${copy}-${p.name}`}
                    aria-hidden={copy === 1 ? undefined : true}
                    className="shrink-0"
                    style={{ width: `${cardWidth}px` }}
                  >
                    {card(p)}
                  </div>
                ))
              )}
            </div>
          </div>

          {showNav && (
            <>
              <button
                aria-label="Previous"
                onClick={() => scrollBy(-1)}
                className="hidden sm:flex absolute -left-4 top-1/3 z-20 -translate-y-1/2 items-center justify-center h-9 w-9 rounded-full bg-white shadow transition-colors hover:bg-[#f5f2ee] hover:text-gold"
              >
                <ChevronLeftIcon size={16} />
              </button>
              <button
                aria-label="Next"
                onClick={() => scrollBy(1)}
                className="hidden sm:flex absolute -right-4 top-1/3 z-20 -translate-y-1/2 items-center justify-center h-9 w-9 rounded-full bg-white shadow transition-colors hover:bg-[#f5f2ee] hover:text-gold"
              >
                <ChevronRightIcon size={16} />
              </button>
            </>
          )}

          {showNav && count > 1 && (
            <div className="mt-[13.6px] flex items-center justify-center gap-[7.2px]">
              {products.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  aria-label={`Go to ${p.name}`}
                  onClick={() => setIndex(count + i)}
                  className={`h-[10px] w-[10px] rounded-full bg-[#a67c3d] transition-[transform,opacity] duration-300 hover:opacity-70 ${
                    i === ((index % count) + count) % count
                      ? "scale-[1.15]"
                      : "scale-100 opacity-[0.28]"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </section>
  );
}
