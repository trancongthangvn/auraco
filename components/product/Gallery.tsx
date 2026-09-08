"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Lightbox from "./Lightbox";
import { useVariant } from "./VariantProvider";
import { ChevronDownIcon } from "@/components/icons";

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
/** Duration for the thumbnail rail's own eased scroll, ms — close to the
 *  hero slide's 300ms so both feel like the same motion language. */
const THUMB_SLIDE_DURATION = 320;

/**
 * Animates `el.scrollTop` to `to` with a gentle ease-in-out curve.
 *
 * `scrollTop` isn't a CSS property, so neither a CSS transition nor the Web
 * Animations API (used for the hero slide above) can animate it — this is
 * the same rAF-tween-with-an-easing-function technique, just applied to a
 * scroll offset instead of a transform. Cancels any scroll this same
 * function has in flight first, so clicking the chevron or a thumbnail
 * again mid-animation retargets smoothly instead of the two fighting over
 * `scrollTop` each frame. Keyed by the element itself (not a single shared
 * module-level id) so two Gallery instances on the same page — a quick-view
 * modal open over the full product page, say — never cancel each other's
 * animation.
 */
const thumbScrollRafs = new WeakMap<HTMLElement, number>();
function animateScrollTop(el: HTMLElement, to: number, duration: number) {
  const running = thumbScrollRafs.get(el);
  if (running) cancelAnimationFrame(running);
  const start = el.scrollTop;
  const change = to - start;
  if (Math.abs(change) < 1) return;
  const startTime = performance.now();
  const step = (now: number) => {
    const t = Math.min((now - startTime) / duration, 1);
    // easeInOutCubic — gentle acceleration then deceleration, the same
    // "nhẹ nhàng uyển chuyển" character as the hero's own
    // cubic-bezier(0.22, 0.61, 0.36, 1), explicit request.
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    el.scrollTop = start + change * eased;
    if (t < 1) thumbScrollRafs.set(el, requestAnimationFrame(step));
  };
  thumbScrollRafs.set(el, requestAnimationFrame(step));
}

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

  // Explicit follow-up request: object-contain (above) stopped photos being
  // cropped, but any photo whose own aspect ratio isn't exactly 4:5 now
  // showed the bg-[#f6f0e6] fill on its sides/top-bottom, which read as a
  // border. The only way to get neither cropping nor a visible fill is for
  // every tile's own box to match that photo's real proportions instead of
  // a fixed ratio — accepted trade-off: the hero (and so the thumbnail
  // column height matched to it) now resizes slightly per photo instead of
  // staying fixed. 4/5 is only ever a placeholder for a photo not yet
  // measured, so nothing collapses to 0 height before its first paint.
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const registerAspect = (src: string, ratio: number) => {
    setAspects((prev) => (prev[src] ? prev : { ...prev, [src]: ratio }));
  };
  // Measured via a plain, off-DOM `Image()` per src rather than each
  // rendered `<img>`'s own `onLoad` — this same photo is mounted in up to
  // four places at once (desktop hero, desktop thumbnail rail, mobile hero,
  // mobile thumbnail strip), each requesting its own differently-sized
  // rendition from Next's image optimizer (`sizes` differs per spot) and
  // firing `onLoad` independently; live measurement caught those onLoad
  // callbacks registering one photo's box with a DIFFERENT photo's ratio
  // (bug report: a perfectly square photo ended up sized like its
  // neighbour). A single dedicated probe per unique src, decoupled from
  // whichever rendered `<img>` happens to load first, removes that
  // ambiguity entirely. Keyed off a joined string, not the array itself —
  // `effectiveImages` is a new array every render, which would otherwise
  // re-run this on every render (harmless but wasteful: each `Image()` is a
  // browser-cache hit after the first time, `registerAspect`'s own guard
  // still no-ops once a src is known).
  const effectiveImagesKey = effectiveImages.join("|");
  useEffect(() => {
    effectiveImages.forEach((src) => {
      if (!src) return;
      const probe = new window.Image();
      probe.onload = () => {
        if (probe.naturalWidth && probe.naturalHeight) {
          registerAspect(src, probe.naturalWidth / probe.naturalHeight);
        }
      };
      probe.src = src;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveImagesKey]);

  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const goPrev = () =>
    setActive((i) => (i - 1 + effectiveImages.length) % effectiveImages.length);
  const goNext = () => setActive((i) => (i + 1) % effectiveImages.length);

  // Mobile hero touch-swipe — explicit request to remove the left/right
  // arrow buttons there; without swipe, tapping a thumbnail below would be
  // the only way left to change photos. Same pattern used by
  // Journal.tsx/Hero.tsx/ProductCarousel.tsx/Testimonials.tsx/VideoCarousel.tsx.
  const mobileHeroRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const dragLockedRef = useRef(false);

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
        goNext();
      } else {
        goPrev();
      }
    }
    dragLockedRef.current = false;
  };

  // React attaches its synthetic `touchmove` as a passive listener, so
  // `preventDefault()` from a JSX `onTouchMove` handler is silently
  // ignored — attaching the listener manually with `{ passive: false }` is
  // what actually lets the horizontal swipe lock out the browser's own
  // edge-navigation gesture instead of dragging the page frame with it.
  useEffect(() => {
    const el = mobileHeroRef.current;
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

  // Desktop mosaic's thumbnail column (>= 1000px only): a "more photos
  // below" chevron matching missoma.com's own desktop gallery (measured
  // live at ~1200px — a vertical thumbnail rail with a paging arrow),
  // without their matching "scroll back up" arrow — the column stays
  // freely draggable/scrollable (native overflow-y-auto, preserved below)
  // for going back, this button only ever pages forward. Explicit request:
  // loop forever instead of stopping at the last photo, with a gentler
  // slide than the browser's own default smooth-scroll easing — the rail
  // is rendered as TWO back-to-back copies of the photo list (thumbList
  // below), and once a scroll (button-driven or a free drag/wheel) settles
  // past the first copy, the wrap effect further down silently rewinds
  // scrollTop by exactly one copy's height. Because the second copy is
  // pixel-identical to the first, that rewind is invisible — the rail just
  // keeps going. No more "hide the arrow at the bottom" state needed.
  const thumbViewportRef = useRef<HTMLDivElement>(null);
  const thumbCount = effectiveImages.length;
  const thumbList = thumbCount > 1 ? [...effectiveImages, ...effectiveImages] : effectiveImages;

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
    // Ignores a 0 reading (the box not laid out yet) rather than storing
    // it — a real hero always has positive height once actually visible,
    // so a 0 here means "not ready", not "the true height is zero".
    const update = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setHeroHeight(h);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
    // Re-runs on every active-photo change too, not just ResizeObserver —
    // found while diagnosing the thumbnail column running visibly taller
    // than the hero (bug report): relying on ResizeObserver alone to catch
    // a follow-up size change doesn't work in every browser context. The
    // hero's own box is a fixed aspect-[4/5] now (see below), so its
    // height only actually varies with the column's width, but this stays
    // as a cheap safety net for that same class of bug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveImages[active]]);

  // Wrap-around for the infinite loop: fires ~120ms after the LAST scroll
  // event, whether that scroll came from our own animateScrollTop (which
  // dispatches a native scroll event every rAF frame, so the debounce
  // keeps getting pushed out until the animation actually finishes) or
  // from the customer freely dragging/wheeling the rail themselves — either
  // way, once things have settled past the first copy, silently rewind by
  // one copy's height. `thumbCount > 1` guards this the same as the
  // rendered column below, so it's a no-op with 0/1 photos.
  useEffect(() => {
    const el = thumbViewportRef.current;
    if (!el || thumbCount <= 1) return;
    let settle: ReturnType<typeof setTimeout>;
    const maybeWrap = () => {
      clearTimeout(settle);
      settle = setTimeout(() => {
        const singleCopyHeight = el.scrollHeight / 2;
        if (el.scrollTop >= singleCopyHeight - 1) {
          el.scrollTop -= singleCopyHeight;
        }
      }, 120);
    };
    el.addEventListener("scroll", maybeWrap);
    return () => {
      clearTimeout(settle);
      el.removeEventListener("scroll", maybeWrap);
    };
  }, [thumbCount, heroHeight]);

  // Scroll the rail so the clicked thumbnail becomes its TOP visible item —
  // measured frame-by-frame off the reference video (missoma.com, product
  // page, ~1920px): clicking the lower of the two visible thumbnails moves
  // that photo up into the upper slot and pulls the next (previously
  // hidden) one into the slot it left. Aligning the clicked thumb to the
  // container's top reproduces that exactly, and correctly does nothing
  // when the already-top thumb is clicked (a blind one-step scroll would
  // wrongly page forward there).
  const scrollThumbToTop = (index: number) => {
    const el = thumbViewportRef.current;
    if (!el) return;
    const thumb = el.children[index] as HTMLElement | undefined;
    if (!thumb) return;
    const delta = thumb.getBoundingClientRect().top - el.getBoundingClientRect().top;
    if (Math.abs(delta) < 1) return;
    animateScrollTop(el, el.scrollTop + delta, THUMB_SLIDE_DURATION);
  };

  const scrollThumbsDown = () => {
    const el = thumbViewportRef.current;
    if (!el) return;
    const firstThumb = el.firstElementChild as HTMLElement | null;
    // Step by one thumbnail's own height (plus the 10px gutter, matching
    // missoma.com's own thumb-slide margin-bottom) so a click pages forward
    // exactly one photo at a time, same as their arrow — falls back to a
    // full viewport page if a thumbnail hasn't rendered its real height yet.
    const step = firstThumb ? firstThumb.getBoundingClientRect().height + 10 : el.clientHeight;
    animateScrollTop(el, el.scrollTop + step, THUMB_SLIDE_DURATION);
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

  // Desktop hero slide transition. Measured off the reference video: the
  // outgoing photo slides out to the left while the incoming one slides in
  // from the right, over ~7 frames at 25.7fps ≈ 280ms, rather than the hero
  // src swapping instantly. Direction follows the index, so clicking a
  // thumbnail above the current one (or the 5s auto-advance wrapping back
  // to the first photo) slides the other way.
  //
  // Driven by the Web Animations API rather than the usual "render the
  // incoming layer off-screen, then flip a transition class on the next
  // frame" trick: that pattern needs requestAnimationFrame to actually
  // fire, and when it doesn't (a background/undisplayed tab throttles it)
  // the hero stays parked off-screen — reproduced here, the hero went
  // blank with its layer stuck at translateX(+100%). With .animate() the
  // element's own resting position IS the correct one, so the worst case
  // when the animation never runs is an instant swap, never a blank hero.
  const currentSrc = effectiveImages[active];
  const prevShownRef = useRef<{ index: number; src: string | undefined }>({
    index: active,
    src: currentSrc,
  });
  const outgoingRef = useRef<HTMLDivElement | null>(null);
  const incomingRef = useRef<HTMLDivElement | null>(null);
  const [slide, setSlide] = useState<{ src: string; dir: 1 | -1 } | null>(null);

  useEffect(() => {
    const prev = prevShownRef.current;
    prevShownRef.current = { index: active, src: currentSrc };
    if (prev.index === active || !prev.src || prev.src === currentSrc) return;
    setSlide({ src: prev.src, dir: active > prev.index ? 1 : -1 });
  }, [active, currentSrc]);

  useEffect(() => {
    if (!slide) return;
    const off = slide.dir === 1 ? "-100%" : "100%";
    const from = slide.dir === 1 ? "100%" : "-100%";
    const timing: KeyframeAnimationOptions = {
      duration: 300,
      easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
    };
    const outAnim = outgoingRef.current?.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(${off})` }],
      { ...timing, fill: "forwards" }
    );
    const inAnim = incomingRef.current?.animate(
      [{ transform: `translateX(${from})` }, { transform: "translateX(0)" }],
      timing
    );
    const done = setTimeout(() => setSlide(null), 320);
    return () => {
      clearTimeout(done);
      outAnim?.cancel();
      inAnim?.cancel();
    };
  }, [slide]);

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
          object-contain, not object-cover: explicit follow-up request —
          some product photos (a bracelet shot as a full circle, say) were
          losing their edges to the fixed aspect-[4/5] box under
          object-cover, which the customer flagged as photos looking cut
          off. Every tile keeps its bg-[#f6f0e6] fill behind the now
          possibly-letterboxed photo, so an image whose own aspect ratio
          doesn't match 4/5 shows a neutral border instead of a crop.
          Supersedes the prior "every box filled edge-to-edge, accepting
          some cropping" decision below.
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
          off by object-cover the wider the window got. max-w matches the
          frame size confirmed against a reference screenshot; past that
          the block just stops growing and centers, leaving blank space on
          a wide screen rather than cropping further.
          750px → 900px: explicit follow-up request, re-measured against a
          1920×1080 @100% reference — the whole product-detail block also
          gained an outer page max-width at the same time (see the product
          page's own wrapper), which shrinks how much of that page-level
          margin's own extra room this cap needs to give back; the two
          together land close to the new reference proportions without
          either one doing the whole job alone. */}
      <div className="hidden min-[1000px]:mx-auto min-[1000px]:grid min-[1000px]:max-w-[900px] min-[1000px]:grid-cols-[2.2fr_1fr] min-[1000px]:gap-[10px]">
        <button
          ref={heroRef}
          type="button"
          aria-label="View full-size image"
          onClick={() => effectiveImages[active] && setLightboxOpen(true)}
          // Fixed aspect-[4/5] frame, every product the same size — see
          // "khung dài khung ngắn không đồng bộ" fix below for why this
          // stays fixed rather than sizing to each photo's own ratio.
          // object-cover (below): explicit follow-up request — the
          // blurred-backdrop fill used before this technically satisfied
          // "no crop, no border", but on a photo whose composition already
          // sat close to a plain/matching background the soft blurred
          // margin still read as a fuzzy leftover edge rather than a clean
          // full-bleed photo (reference: image showing the desired look,
          // a photo that already fills its frame edge-to-edge). Explicit
          // permission given to crop instead, provided the crop only ever
          // eats into a photo's own margin/background and never the
          // product itself — every photo in this catalog is shot with the
          // piece centered and comfortable margin around it, so cropping
          // to fill a 4:5 frame crops that margin first.
          className="group relative aspect-[4/5] self-start overflow-hidden rounded-[10px] bg-[#f6f0e6] cursor-zoom-in"
        >
          {/* Outgoing photo — mounted only while a slide is running, and
              only ever the one being replaced, so a jump across several
              indexes slides straight from old to new rather than running
              through every photo in between (matches the reference, where
              clicking the second thumbnail slid directly to it). Source
              images are served at full resolution (Next/Image `sizes`
              below unchanged), so cropping the display box doesn't reduce
              sharpness. */}
          {slide && (
            <div key={slide.src} ref={outgoingRef} className="absolute inset-0">
              <Image
                src={slide.src}
                alt=""
                fill
                sizes="(min-width: 1000px) 47vw, 100vw"
                className="object-cover"
              />
            </div>
          )}
          {/* No `key` here either — see the mobile hero below for why. */}
          {effectiveImages[active] && (
            <div ref={incomingRef} className="absolute inset-0">
              <Image
                src={effectiveImages[active]}
                alt={name}
                fill
                priority
                sizes="(min-width: 1000px) 47vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
          )}
        </button>
        {effectiveImages.length > 1 && (
          // Height comes from the measured hero (see heroHeight above), not
          // from the grid row. The chevron below is a sibling, not part of
          // the scroll area, so it never gets scrolled out of view
          // alongside the thumbnails.
          <div
            className="flex flex-col gap-2 self-start overflow-hidden"
            // `heroHeight !== null`, not a truthy check: a genuinely
            // measured 0 (element not yet laid out) is a real number, and
            // `0 ? ... : undefined` would silently treat it the same as
            // "never measured", leaving the column unconstrained — exactly
            // the reported bug (the thumbnail column running taller than
            // the hero it's supposed to match).
            style={heroHeight !== null ? { height: `${heroHeight}px` } : undefined}
          >
            <div
              ref={thumbViewportRef}
              className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {thumbList.map((src, i) => (
                <button
                  key={`${i}-${src}`}
                  type="button"
                  aria-label={`Show image ${(i % thumbCount) + 1} of ${thumbCount}`}
                  aria-current={active === i % thumbCount ? "true" : undefined}
                  onClick={() => {
                    setActive(i % thumbCount);
                    scrollThumbToTop(i);
                  }}
                  // No selected-state outline: explicit request to leave the
                  // thumbnails as plain images. `aria-current` above still
                  // conveys the selection to screen readers.
                  // Height comes from this photo's own measured aspect ratio
                  // (`aspects`, populated on load below), not a fixed or
                  // rail-derived height — explicit follow-up request: fitting
                  // a mismatched photo (a bracelet shot as a wide circle,
                  // say) into a box with a different ratio always left
                  // either a crop (object-cover) or a visible bg-[#f6f0e6]
                  // letterbox border (object-contain) on one axis. Sizing
                  // the box itself to the photo's real proportions is the
                  // only way to get neither. Supersedes the prior "exactly
                  // 2 tiles fill the rail" sizing — the rail can now show a
                  // partial 3rd tile or leave a gap above the chevron
                  // depending on the active photo's own ratio, an accepted
                  // trade-off for showing every photo uncropped and
                  // borderless.
                  className="group relative w-full shrink-0 overflow-hidden rounded-[10px] bg-[#f6f0e6]"
                  style={{ aspectRatio: aspects[src] ?? 4 / 5 }}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="30vw"
                    className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>
            {/* Always visible now (no more "hide at the bottom" clamp) — the
                rail loops forever, so there's never a dead end to hide it
                for. Explicit request. */}
            <button
              type="button"
              aria-label="Show more images"
              onClick={scrollThumbsDown}
              className="flex shrink-0 items-center justify-center py-0.5 text-[#2b261f]/50 transition-colors hover:text-[#2b261f]"
            >
              <ChevronDownIcon size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Hero + thumbnail strip — everything under 1000px, phones included. */}
      <div className="min-[1000px]:hidden">
        <div
          ref={mobileHeroRef}
          className="relative touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            aria-label="View full-size image"
            onClick={() => effectiveImages[active] && setLightboxOpen(true)}
            // Same fixed aspect-[4/5] frame as the ≥1000px hero above —
            // explicit follow-up request to bring mobile in line with the
            // desktop fix ("chưa đồng bộ khung như trên desktop"): sizing
            // the box to each photo's own ratio kept every photo uncropped
            // but made the frame a different size per photo/product, and a
            // flat bg-[#f6f0e6] fill on a mismatched photo read as a
            // border either way. object-cover (below) fills this fixed
            // frame by cropping a non-4:5 photo's own margin/background
            // first — every catalog photo is shot with the piece centered
            // and margin around it — matching the desktop hero exactly.
            className="group relative block w-full aspect-[4/5] overflow-hidden rounded-[10px] bg-[#f6f0e6] cursor-zoom-in"
          >
            {/* No `key` here — keying this on the src forced Next/Image to
                unmount and remount on every change (including the 5s
                auto-advance tick), which blanked the frame for a beat while
                the new image loaded. Letting the same Image instance just
                take a new `src` avoids that flash entirely. Source images
                are served at full resolution (`sizes` unchanged), so
                cropping the display box doesn't reduce sharpness. */}
            {effectiveImages[active] && (
              <Image
                src={effectiveImages[active]}
                alt={name}
                fill
                priority
                sizes="100vw"
                className="object-cover transition-opacity duration-500"
              />
            )}
          </button>
          {/* Prev/next arrow buttons removed — explicit request. Touch-swipe
              (above) plus tapping a thumbnail below now cover navigation. */}
        </div>

        {effectiveImages.length > 1 && (
          <div className="mt-2 flex flex-row items-start gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {effectiveImages.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`Show image ${i + 1} of ${effectiveImages.length}`}
                aria-current={active === i ? "true" : undefined}
                onClick={() => setActive(i)}
                // 10px radius to match the ≥1000px thumbnail column; w-16
                // keeps every tile's width at the previous 80px. Height is
                // this photo's own aspect ratio (see `aspects` above), not
                // a fixed 4/5 — items-start on the row (above) keeps each
                // tile at its own natural height instead of flex's default
                // stretch-to-tallest, so a photo isn't padded out just
                // because its neighbor in the strip is taller.
                className={`relative w-16 shrink-0 overflow-hidden rounded-[10px] bg-[#f6f0e6] transition-opacity hover:opacity-100 ${
                  active === i ? "opacity-100" : "opacity-80"
                }`}
                style={{ aspectRatio: aspects[src] ?? 4 / 5 }}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Portaled straight to <body> rather than rendered in place: this
          whole column is `lg:sticky`, and once it's actually stuck, a
          `position: fixed` descendant confirmed live to get its position
          computed relative to THIS sticky column instead of the viewport —
          the lightbox rendered confined to the gallery's own on-screen box
          instead of covering the page, leaving the carousels above/below
          it fully visible around it. A portal makes the lightbox a direct
          child of <body>, outside the sticky column entirely, so there's
          no sticky ancestor left for that miscomputation to happen against. */}
      {lightboxOpen &&
        createPortal(
          <Lightbox
            images={effectiveImages}
            name={name}
            index={active}
            onIndexChange={setActive}
            onClose={() => setLightboxOpen(false)}
          />,
          document.body
        )}
    </div>
  );
}
