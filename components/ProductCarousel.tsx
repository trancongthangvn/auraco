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
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();
  const { currency } = useCurrency();

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

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const sync = () => setViewportWidth(el.clientWidth);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
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

  const step = CAROUSEL_CARD + CAROUSEL_GAP;
  // Offset that parks card `index` in the middle of the viewport.
  const offset = index * step - (viewportWidth - CAROUSEL_CARD) / 2;

  const scrollBy = (dir: 1 | -1) => setIndex((i) => i + dir);

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
            className={`object-cover transition-[opacity,transform] duration-500 ${
              p.hoverImg
                ? "group-hover:opacity-0"
                : "group-hover:scale-105"
            }`}
          />
        )}
        {/* On-model shot revealed on hover, matching the catalog cards. */}
        {p.hoverImg && (
          <Image
            src={p.hoverImg}
            alt=""
            fill
            sizes={layout === "grid" ? "(min-width: 640px) 33vw, 50vw" : "320px"}
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
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
          {p.priceValue !== undefined ? formatPrice(p.priceValue, currency) : p.price}
        </p>
      </div>
    </Link>
  );

  return (
    <section ref={revealRef} className={`home-block mx-auto ${revealClass}`}>
      <div>
      {/* An empty title means the section is headed by something else.
          Carousel sections (Best Sellers / You May Also Like) get a plain
          left-aligned heading — no card chrome around them either, just
          image + caption butted together — rather than the centered,
          uppercase section-title band used on homepage grid sections. */}
      {(title || subtitle) && (
        <div className={boxed ? "mb-5 flex items-baseline justify-between" : "text-center mb-5"}>
          {title && (
            <h2
              className={
                boxed
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
          <div ref={viewportRef} className="overflow-hidden py-6">
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
                    className="w-[320px] shrink-0"
                  >
                    {card(p)}
                  </div>
                ))
              )}
            </div>
          </div>

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

          {count > 1 && (
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
