"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/icons";

export type SeeItIRLVideo = {
  slug: string;
  name: string;
  videoUrl: string;
  thumbnail?: string;
};

const FALLBACK_ADVANCE_MS = 8000;

/**
 * "See It IRL" — measured directly off auracojewelry.com's product page
 * (`.product-video-list` / `.product-video-float`). Explicit request: the
 * inline thumbnail now autoplays (muted) as soon as it scrolls into view —
 * no click needed — and advances to the next clip in `videos` (the current
 * product's own video first, then similar products' videos, built by the
 * page server component) once the active one ends, looping back to the
 * start. Clicking it still opens the floating bottom-right player — fixed
 * to the viewport rather than a full-screen/dimmed lightbox, confirmed live
 * on the reference: clicking the page behind it does NOT dismiss it, only
 * its own × does — with sound and native controls, seeded at the same
 * clip that's currently active inline.
 */
export default function SeeItIRL({ videos }: { videos: SeeItIRLVideo[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [inView, setInView] = useState(false);
  const inlineRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const count = videos.length;
  const active = videos[index];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = inlineRef.current;
    if (!video) return;
    video.muted = true;
    if (inView && !open) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [inView, open, index]);

  // Advance when the active clip ends, same pattern as the homepage
  // VideoCarousel — a fallback timer covers a clip that never fires `ended`
  // (autoplay blocked, a load error).
  useEffect(() => {
    if (count === 0 || open) return;
    const video = inlineRef.current;
    const advance = () => setIndex((i) => (i + 1) % count);
    video?.addEventListener("ended", advance);
    const id = setTimeout(advance, FALLBACK_ADVANCE_MS);
    return () => {
      video?.removeEventListener("ended", advance);
      clearTimeout(id);
    };
  }, [index, count, open]);

  if (count === 0 || !active) return null;

  const close = () => {
    playerRef.current?.pause();
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="mt-5 border-t border-gold-light/35 pt-5">
      <h2 className="font-serif-display text-[21px] font-bold leading-[24.15px] text-[#28241f] mb-3">
        See It IRL
      </h2>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Play ${active.name} video`}
        className="group relative block aspect-[3/4] w-[112.5px] overflow-hidden rounded-[10px] bg-[#111]"
      >
        <video
          key={active.slug}
          ref={inlineRef}
          src={`${active.videoUrl}#t=0.1`}
          poster={active.thumbnail || undefined}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>

      {open && (
        <aside
          aria-label="Product video player"
          className="fixed bottom-3 right-3 z-[90] w-[290px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[14px] bg-[#111] shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:bottom-[25.6px] sm:right-[25.6px] sm:w-[360px]"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close video"
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <CloseIcon size={16} />
          </button>
          <video
            ref={playerRef}
            src={active.videoUrl}
            autoPlay
            controls
            playsInline
            preload="metadata"
            className="block w-full"
          />
          <p className="px-3 py-2 font-ui text-[12.8px] text-white/85">{active.name}</p>
        </aside>
      )}
    </div>
  );
}
