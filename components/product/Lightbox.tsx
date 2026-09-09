"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/**
 * Full-screen image viewer, opened by clicking the gallery's main frame —
 * matching the reference's `.pd-lightbox` (measured on auracojewelry.com):
 * a 94%-opaque near-black backdrop, a 66px top bar holding only the close
 * button, and the image centred and contained in the remaining space, with
 * round translucent-white prev/next controls pinned to the stage edges.
 */
export default function Lightbox({
  images,
  name,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  name: string;
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  // Pinch-to-zoom, mobile only by nature (touch events) — explicit request
  // to let a customer magnify the photo for detail. It is implemented HERE,
  // inside the dialog, rather than by re-opening the browser's own
  // page-level pinch: app/layout.tsx caps maximumScale to 1 and sets
  // userScalable false on purpose, because a fast horizontal swipe near the
  // screen edge was being misread as a pinch and zooming the whole layout
  // out mid-swipe. That fix stays exactly as it is.
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  // Written during a gesture and read on the next touch event, so it must
  // not go through state (a re-render per touchmove would lag the pinch).
  const gesture = useRef({
    pinchDist: 0,
    midX: 0,
    midY: 0,
    panX: 0,
    panY: 0,
    scale: 1,
    tx: 0,
    ty: 0,
    moved: false,
  });
  // Read during render (it switches the transform's transition off), so it
  // cannot live on the ref above — refs must not be read while rendering.
  const [gesturing, setGesturing] = useState(false);

  const MAX_SCALE = 3;

  /** Keeps the photo's own edges from being dragged inside the frame: at
   *  scale s the image overhangs by (s-1)/2 of the frame in each direction,
   *  and that overhang is exactly how far it may travel. */
  const clamp = useCallback((nextScale: number, nextTx: number, nextTy: number) => {
    const el = frameRef.current;
    const w = el ? el.clientWidth : 0;
    const h = el ? el.clientHeight : 0;
    const maxX = ((nextScale - 1) * w) / 2;
    const maxY = ((nextScale - 1) * h) / 2;
    return {
      tx: Math.min(maxX, Math.max(-maxX, nextTx)),
      ty: Math.min(maxY, Math.max(-maxY, nextTy)),
    };
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    gesture.current.scale = 1;
    gesture.current.tx = 0;
    gesture.current.ty = 0;
  }, []);

  /** Every photo starts unzoomed — carrying one photo's pan offset onto the
   *  next would land the viewer somewhere arbitrary in it. Done here, at the
   *  one place the photo changes, rather than in an effect on `index`. */
  const goTo = useCallback(
    (i: number) => {
      resetZoom();
      onIndexChange(i);
    },
    [onIndexChange, resetZoom]
  );

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const g = gesture.current;
    setGesturing(true);
    g.moved = false;
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      g.pinchDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      g.midX = (a.clientX + b.clientX) / 2;
      g.midY = (a.clientY + b.clientY) / 2;
    } else if (e.touches.length === 1) {
      g.panX = e.touches[0].clientX;
      g.panY = e.touches[0].clientY;
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      if (g.pinchDist > 0) {
        const wanted = g.scale * (dist / g.pinchDist);
        const next = Math.min(MAX_SCALE, Math.max(1, wanted));
        const k = next / g.scale;
        // Zoom about the point between the fingers, so the detail being
        // pinched stays under them instead of sliding to the centre. The
        // midpoint's own drift is added on top, which makes a two-finger
        // drag pan at the same time.
        const fx = midX - cx;
        const fy = midY - cy;
        const zoomedX = fx - (fx - g.tx) * k;
        const zoomedY = fy - (fy - g.ty) * k;
        const c = clamp(next, zoomedX + (midX - g.midX), zoomedY + (midY - g.midY));
        g.scale = next;
        g.tx = c.tx;
        g.ty = c.ty;
        g.pinchDist = dist;
        g.midX = midX;
        g.midY = midY;
        g.moved = true;
        setScale(next);
        setTx(c.tx);
        setTy(c.ty);
      }
    } else if (e.touches.length === 1 && g.scale > 1) {
      // One finger pans, but only while zoomed in — at 1x the frame keeps
      // its original behaviour of doing nothing on a drag.
      const t = e.touches[0];
      const c = clamp(g.scale, g.tx + (t.clientX - g.panX), g.ty + (t.clientY - g.panY));
      g.panX = t.clientX;
      g.panY = t.clientY;
      g.tx = c.tx;
      g.ty = c.ty;
      g.moved = true;
      setTx(c.tx);
      setTy(c.ty);
    }
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (e.touches.length === 0) {
      setGesturing(false);
      g.pinchDist = 0;
      // Pinching back out snaps cleanly to the untouched 1x frame rather
      // than settling at 1.02 with a stray offset.
      if (g.scale <= 1.02) resetZoom();
    } else if (e.touches.length === 1) {
      // Second finger lifted mid-pinch — carry on as a pan from where that
      // finger now is, instead of jumping by the whole distance.
      g.panX = e.touches[0].clientX;
      g.panY = e.touches[0].clientY;
      g.pinchDist = 0;
    }
  };

  /** Tapping the photo closes, exactly as before — but not while zoomed in
   *  (that tap is someone inspecting the piece, not asking to leave) and
   *  not when the "tap" was really the end of a pinch or a pan. */
  const onFrameClick = () => {
    if (gesture.current.moved) {
      gesture.current.moved = false;
      return;
    }
    if (scale > 1) return;
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goTo((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") goTo((index + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    // The reference locks background scroll while its lightbox is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, images.length, goTo, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className="fixed inset-0 z-[300] flex flex-col bg-[rgba(18,16,13,0.94)]"
    >
      <div className="flex h-[66px] shrink-0 items-center justify-end px-6">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/[0.12] text-[25.6px] leading-none text-white hover:bg-white/20"
        >
          &times;
        </button>
      </div>

      <div className="relative flex-1">
        {/* Clicking the backdrop (outside the image) closes, same as the
            reference — the image itself doesn't need its own stopPropagation
            since it has no click handler of its own here. */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 h-full w-full cursor-zoom-out"
        />
        {/* [container-type:size] makes this padded stage the reference box
            for the cqw/cqh units below — that is what lets the frame be
            sized against BOTH of the stage's dimensions at once. */}
        <div className="pointer-events-none absolute inset-0 flex [container-type:size] items-center justify-center p-6">
          {images[index] && (
            // Fixed aspect-[4/5] frame, not object-contain filling however
            // much space each photo's own ratio happens to need — explicit
            // follow-up request: a tall lifestyle/portrait photo filled
            // nearly the whole screen while a near-square product shot
            // showed much smaller with big margins, reading as
            // inconsistent between photos. Same fixed 4:5 frame + crop
            // trade-off already applied to the gallery's own hero image.
            // object-cover crops a mismatched photo's own margin to fill
            // it — source images are still served at full resolution
            // (`sizes` unchanged), so this doesn't affect sharpness.
            //
            // The height is picked explicitly rather than left to
            // `h-full` + `max-w-full`, which silently broke the ratio on
            // phones: with a definite height, the width is derived from
            // the ratio and then CLAMPED by max-width, but the height is
            // never recomputed from that clamp — so on a 375px viewport
            // the frame came out 327x698 (ratio 0.47) instead of 4:5,
            // cropping far harder than the same photo on the page behind
            // it. Desktop never showed it because a wide stage means
            // max-width never bites. min(100cqh, 125cqw) is the tallest
            // 4:5 box that fits the stage BOTH ways: the derived width,
            // 80% of it, is min(80cqh, 100cqw), so neither dimension can
            // overflow and the ratio stays exact at every viewport.
            // pointer-events-auto (the wrapper above is none) is what
            // lets the pinch handlers see the touches at all; the click
            // handler keeps tap-to-close working the way it did when those
            // taps fell straight through to the backdrop button.
            // touch-none stops the browser treating a pinch here as a page
            // gesture. overflow-hidden keeps the magnified photo inside
            // the frame instead of spilling over the close/next controls —
            // the frame's own size and 4:5 ratio are untouched.
            <div
              ref={frameRef}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onClick={onFrameClick}
              className="pointer-events-auto relative aspect-[4/5] h-[min(100cqh,125cqw)] touch-none overflow-hidden"
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                  // No transition while the fingers are down — an eased
                  // transform lags behind a live pinch. It only animates
                  // for the snap back to 1x when the gesture ends.
                  transition: gesturing ? "none" : "transform 200ms ease-out",
                }}
              >
                <Image
                  src={images[index]}
                  alt={name}
                  fill
                  // Bigger than the 100vw this used to ask for: at 1x it
                  // costs a sharper file on a deliberate "view full size"
                  // tap, and it is what keeps the photo from turning to
                  // mush at 3x. Only this dialog's copy is affected — the
                  // gallery's own hero still requests 100vw.
                  sizes="(max-width: 1000px) 200vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => goTo((index - 1 + images.length) % images.length)}
              className="absolute left-6 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.12] text-white hover:bg-white/20"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => goTo((index + 1) % images.length)}
              className="absolute right-6 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.12] text-white hover:bg-white/20"
            >
              <ChevronRightIcon size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
