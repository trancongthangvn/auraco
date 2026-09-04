"use client";

import { useRef, useState } from "react";
import { CloseIcon } from "@/components/icons";

/**
 * "See It IRL" — measured directly off auracojewelry.com's product page
 * (`.product-video-list` / `.product-video-float`). A single portrait video
 * thumbnail (the product's own `video_url`, already uploaded via
 * admin/products and already used by the homepage VideoCarousel — this just
 * gives it a second home on the product page itself, no new upload path
 * needed); clicking it opens a small floating player fixed to the bottom-right
 * corner of the viewport, playing with native controls, over the page rather
 * than a full-screen/dimmed lightbox — confirmed live: clicking the page
 * behind it does NOT dismiss it, only its own × does. Reference values:
 * desktop floater 360px wide, 25.6px from the bottom/right edges, 14px
 * corner radius; mobile 290px wide, 12px from the edges.
 */
export default function SeeItIRL({
  videoUrl,
  thumbnail,
  name,
}: {
  videoUrl?: string;
  thumbnail?: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const playerRef = useRef<HTMLVideoElement>(null);

  if (!videoUrl) return null;

  const close = () => {
    playerRef.current?.pause();
    setOpen(false);
  };

  return (
    <div className="mt-5 border-t border-gold-light/35 pt-5">
      <h2 className="font-serif-display text-[21px] font-bold leading-[24.15px] text-[#28241f] mb-3">
        See It IRL
      </h2>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Play ${name} video`}
        className="group relative block aspect-[3/4] w-[112.5px] overflow-hidden rounded-[10px] bg-[#111]"
      >
        <video
          src={`${videoUrl}#t=0.1`}
          poster={thumbnail || undefined}
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
            src={videoUrl}
            autoPlay
            controls
            playsInline
            preload="metadata"
            className="block w-full"
          />
          <p className="px-3 py-2 font-ui text-[12.8px] text-white/85">{name}</p>
        </aside>
      )}
    </div>
  );
}
