"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    // The reference locks background scroll while its lightbox is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, images.length, onIndexChange, onClose]);

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
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          {images[index] && (
            // Fixed aspect-[4/5] frame, not object-contain filling however
            // much space each photo's own ratio happens to need — explicit
            // follow-up request: a tall lifestyle/portrait photo filled
            // nearly the whole screen while a near-square product shot
            // showed much smaller with big margins, reading as
            // inconsistent between photos. Same fixed 4:5 frame + crop
            // trade-off already applied to the gallery's own hero image;
            // h-full plus max-w-full/max-h-full sizes this box as large as
            // possible within the available stage while keeping the ratio
            // exact (modern browsers resolve aspect-ratio against both
            // constraints together), so every photo now occupies the same
            // shape and size. object-cover crops a mismatched photo's own
            // margin to fill it — source images are still served at full
            // resolution (`sizes` unchanged), so this doesn't affect
            // sharpness.
            <div className="relative h-full max-h-full w-auto max-w-full aspect-[4/5]">
              <Image
                src={images[index]}
                alt={name}
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          )}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
              className="absolute left-6 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.12] text-white hover:bg-white/20"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => onIndexChange((index + 1) % images.length)}
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
