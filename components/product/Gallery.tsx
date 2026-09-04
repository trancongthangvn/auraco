"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Lightbox from "./Lightbox";
import { useVariant } from "./VariantProvider";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "@/components/icons";

/**
 * Product gallery, two distinct layouts split at 1000px (per the site
 * owner's own mockups, not a Tailwind default breakpoint) — both driven by
 * the same `active` hero index:
 *
 * - `>= 1000px`: a mosaic — the hero (large, left) plus a thumbnail column
 *   on the right sized to show exactly 2 at a time, the rest reachable by
 *   scrolling. Clicking a thumbnail sets the hero; the hero itself still
 *   opens the lightbox.
 * - `< 1000px` (identical from 999px down through phone widths, per the
 *   owner): the same hero with a horizontal thumbnail strip below it
 *   instead of a column.
 *
 * In both layouts the hero auto-advances every 5s, looping back to the
 * first image, unless the customer has clicked a thumbnail — see the effect
 * below for how a manual pick restarts that window instead of racing it.
 */
export default function Gallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const { selectedVariant } = useVariant();
  // A variant only ever supplies its own hero shot (the admin has no field
  // for anything beyond `front_image` — `hoverImages` is a DB column no UI
  // writes to, so it's empty for every variant in practice). An earlier
  // version replaced the WHOLE gallery with just that one image whenever a
  // variant was selected, wiping every other product photo. That was fixed
  // to swap the FIRST (hero) slot instead — but the product's own hero shot
  // is usually a styled/lifestyle photo, and a variant's `front_image` is
  // typically a plain product-only shot (see the admin's "Ảnh biến thể" field
  // on ProductVariants), so replacing the hero with it made the page open on
  // a visibly lower-effort image. Per explicit request: the product's own
  // photos stay in their original order and position — including the hero —
  // and the variant's image is inserted as the second photo instead of
  // displacing anything. Deduped in case the variant's image happens to
  // already be one of the product's own gallery photos.
  const effectiveImages = (() => {
    if (!selectedVariant?.frontImage) return images;
    const rest = images.filter((src) => src !== selectedVariant.frontImage);
    return [
      rest[0] ?? selectedVariant.frontImage,
      selectedVariant.frontImage,
      ...selectedVariant.hoverImages,
      ...rest.slice(1),
    ];
  })();

  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const goPrev = () =>
    setActive((i) => (i - 1 + effectiveImages.length) % effectiveImages.length);
  const goNext = () => setActive((i) => (i + 1) % effectiveImages.length);

  // Desktop mosaic's thumbnail column (>= 1000px only): explicit request to
  // add a "more photos below" chevron matching missoma.com's own desktop
  // gallery (measured live at ~1200px — a vertical thumbnail rail with a
  // paging arrow), without their matching "scroll back up" arrow — the
  // column stays freely draggable/scrollable for going back, this button
  // only ever pages forward. Hidden once already scrolled to the bottom so
  // it never dead-ends a click.
  const thumbViewportRef = useRef<HTMLDivElement>(null);
  const [canScrollThumbsDown, setCanScrollThumbsDown] = useState(false);

  // CSS Grid's own auto-row-sizing measures the RAW content height of every
  // item in the row — including the thumbnail column's unclipped stack of
  // aspect-[4/5] tiles (over 1700px tall for a 6-photo product) — before
  // align-items: stretch ever applies, so `h-full` on the column ended up
  // matching that inflated row instead of the hero's own aspect-ratio
  // height (measured live: the row grew to fit the tallest CONTENT, not the
  // tallest FINAL size). Measuring the hero directly and applying it as an
  // explicit pixel height sidesteps that grid quirk entirely.
  const heroRef = useRef<HTMLButtonElement>(null);
  const [heroHeight, setHeroHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const update = () => setHeroHeight(el.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const syncThumbScrollState = useCallback(() => {
    const el = thumbViewportRef.current;
    if (!el) return;
    setCanScrollThumbsDown(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  }, []);

  useEffect(() => {
    const el = thumbViewportRef.current;
    if (!el) return;
    syncThumbScrollState();
    el.addEventListener("scroll", syncThumbScrollState);
    const observer = new ResizeObserver(syncThumbScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", syncThumbScrollState);
      observer.disconnect();
    };
  }, [effectiveImages.length, heroHeight, syncThumbScrollState]);

  const scrollThumbsDown = () => {
    const el = thumbViewportRef.current;
    if (!el) return;
    const firstThumb = el.firstElementChild as HTMLElement | null;
    // Step by one thumbnail's own height (plus the 10px gutter, matching
    // missoma.com's own thumb-slide margin-bottom) so a click pages forward
    // exactly one photo at a time, same as their arrow — falls back to a
    // full viewport page if a thumbnail hasn't rendered its real height yet.
    const step = firstThumb ? firstThumb.getBoundingClientRect().height + 10 : el.clientHeight;
    el.scrollBy({ top: step, behavior: "smooth" });
    // The scroll listener alone is enough in a normal browser, but a smooth
    // scroll's own events can be dropped (seen live in an automated one),
    // which would leave this arrow showing at the very bottom with nothing
    // left to scroll to. Re-checking once the animation has settled makes
    // hiding it reliable either way.
    setTimeout(syncThumbScrollState, 600);
  };

  // Reset the active index whenever the variant changes, so a variant with
  // fewer images than the previous one never leaves the frame on an
  // out-of-range/undefined image. Adjusted during render (React's own
  // pattern for resetting state when a prop changes) rather than in an
  // effect, which would cause an extra cascading render.
  const [prevVariantId, setPrevVariantId] = useState(selectedVariant?.id);
  if (prevVariantId !== selectedVariant?.id) {
    setPrevVariantId(selectedVariant?.id);
    setActive(0);
  }

  // Auto-advance the hero image every 5s, looping back to the first. Keyed
  // off `active` itself (not a fixed-interval timer) so a manual thumbnail
  // click restarts the 5s window from wherever the customer just jumped to,
  // instead of the next auto-step landing a moment later and feeling like
  // the click didn't register.
  useEffect(() => {
    if (effectiveImages.length <= 1) return;
    const id = setTimeout(() => {
      setActive((i) => (i + 1) % effectiveImages.length);
    }, 5000);
    return () => clearTimeout(id);
  }, [active, effectiveImages.length]);

  return (
    // Explicit request, confirmed against missoma.com's own
    // `.product__column-sticky` (measured live: position: sticky; top: 97px
    // — the height of their sticky header): the image column used to
    // scroll away with the page like any other element, so a long product
    // description or a wide-open accordion left it out of view while the
    // customer kept reading. Sticky only at `lg` (1024px), matching the
    // page's own breakpoint for splitting into the two-column layout
    // (app/(storefront)/product/[slug]/page.tsx's `lg:grid-cols-[...]`) —
    // below that the page is a single stacked column, where "sticky" has no
    // side-by-side content to stay level with. `self-start` stops the grid
    // from stretching this column to match the (often taller) info
    // column's height, which would otherwise leave sticky nothing to
    // scroll past. Top offset composes Announcement's and Header's own
    // published heights (see their own components) so it sits exactly
    // below both, however tall either currently is.
    <div className="min-w-0 lg:sticky lg:top-[calc(var(--announcement-h,0px)+var(--header-h,64px)+16px)] lg:self-start">
      {/* Desktop mosaic — >= 1000px only.
          Fixed-ratio columns and object-cover on every tile: every box
          filled edge-to-edge (no empty frame), accepting some edge cropping
          — explicit request, confirmed against a reference example.
          Column ratio: explicit request to narrow the right column to 3/4 of
          its previous width (318px → ~239px) while the hero absorbs the
          reclaimed space — `1.4fr 1fr` gave the right column a 1/2.4≈0.417
          share of the row; `2.2fr 1fr` gives it 1/3.2≈0.3125, i.e. 0.75× as
          much, with the hero's share growing to fill the rest.
          Block height: no longer a fixed px/vh value — explicit request to
          match missoma.com's own desktop gallery (measured live at
          ~1200px), which sizes every tile — hero included — off a fixed
          ~4:5 image aspect ratio instead of a shared block height. aspect-
          [4/5] on the hero drives the row's height (CSS Grid's default
          align-items: stretch then fills the thumbnail column to match), so
          this stays proportional at any width instead of the crop ratio
          drifting with the viewport, and it composes with max-w-[750px]
          below rather than replacing it.
          Corner radius (10px) and every gap (10px: hero↔column, and between
          stacked thumbnails) are pixel-matched to missoma.com's own values
          too — measured live (border-radius: 10px on their media container,
          `gap: 10px` on the column wrapper, each thumb-slide's own
          `margin-bottom: 10px`) rather than left at Tailwind's rounded-lg
          (8px) / gap-3 (12px), which were close but not exact. */}
      {/* Explicit request: the width used to grow with the page's own
          responsive column track, so on a wide screen the (height-capped)
          tiles got stretched wider and wider — more of each photo cropped
          off by object-cover the wider the window got. max-w-[750px]
          matches the frame size confirmed against a reference screenshot;
          past that the block just stops growing and centers, leaving blank
          space on a wide screen rather than cropping further. */}
      <div className="hidden min-[1000px]:mx-auto min-[1000px]:grid min-[1000px]:max-w-[750px] min-[1000px]:grid-cols-[2.2fr_1fr] min-[1000px]:gap-[10px]">
        <button
          ref={heroRef}
          type="button"
          aria-label="View full-size image"
          onClick={() => effectiveImages[active] && setLightboxOpen(true)}
          className="group relative aspect-[4/5] self-start overflow-hidden rounded-[10px] bg-[#f6f0e6] cursor-zoom-in"
        >
          {/* No `key` here either — see the mobile hero below for why. */}
          {effectiveImages[active] && (
            <Image
              src={effectiveImages[active]}
              alt={name}
              fill
              priority
              sizes="(min-width: 1000px) 47vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )}
        </button>
        {effectiveImages.length > 1 && (
          // Height comes from the measured hero (see heroHeight above), not
          // from the grid row. The chevron below is a sibling, not part of
          // the scroll area, so it never gets scrolled out of view
          // alongside the thumbnails.
          <div
            className="flex flex-col gap-2 self-start overflow-hidden"
            style={heroHeight ? { height: `${heroHeight}px` } : undefined}
          >
            <div
              ref={thumbViewportRef}
              className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {effectiveImages.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`Show image ${i + 1} of ${effectiveImages.length}`}
                  aria-current={active === i ? "true" : undefined}
                  onClick={() => setActive(i)}
                  className={`group relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-[10px] bg-[#f6f0e6] ${
                    active === i ? "ring-2 ring-[#2b261f]" : ""
                  }`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="30vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>
            {/* Kept mounted (just faded) at the bottom of the list rather
                than unmounted: removing it handed its ~30px back to the
                scroll area, which visibly re-flowed the thumbnails on the
                last click. */}
            <button
              type="button"
              aria-label="Show more images"
              onClick={scrollThumbsDown}
              aria-hidden={!canScrollThumbsDown}
              tabIndex={canScrollThumbsDown ? undefined : -1}
              className={`flex shrink-0 items-center justify-center py-0.5 text-[#2b261f]/50 transition-[color,opacity] hover:text-[#2b261f] ${
                canScrollThumbsDown ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronDownIcon size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Hero + thumbnail strip — everything under 1000px, phones included. */}
      <div className="min-[1000px]:hidden">
        <div className="relative">
          <button
            type="button"
            aria-label="View full-size image"
            onClick={() => effectiveImages[active] && setLightboxOpen(true)}
            className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-[#f6f0e6] cursor-zoom-in"
          >
            {/* No `key` here — keying this on the src forced Next/Image to
                unmount and remount on every change (including the 5s
                auto-advance tick), which blanked the frame for a beat while
                the new image loaded. Letting the same Image instance just
                take a new `src` avoids that flash entirely. */}
            {effectiveImages[active] && (
              <Image
                src={effectiveImages[active]}
                alt={name}
                fill
                priority
                sizes="100vw"
                className="object-contain transition-opacity duration-500"
              />
            )}
          </button>

          {effectiveImages.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={goPrev}
                className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#28241f] shadow transition-colors hover:bg-white"
              >
                <ChevronLeftIcon size={16} />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={goNext}
                className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#28241f] shadow transition-colors hover:bg-white"
              >
                <ChevronRightIcon size={16} />
              </button>
            </>
          )}
        </div>

        {effectiveImages.length > 1 && (
          <div className="mt-2 flex flex-row gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {effectiveImages.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`Show image ${i + 1} of ${effectiveImages.length}`}
                aria-current={active === i ? "true" : undefined}
                onClick={() => setActive(i)}
                className={`relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f6f0e6] transition-opacity hover:opacity-100 ${
                  active === i ? "opacity-100 ring-2 ring-[#2b261f]" : "opacity-80"
                }`}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover object-top" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <Lightbox
          images={effectiveImages}
          name={name}
          index={active}
          onIndexChange={setActive}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
