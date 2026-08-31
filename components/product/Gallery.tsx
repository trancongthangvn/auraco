"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "./Lightbox";

/**
 * Product gallery: one large frame plus a thumbnail rail.
 *
 * Every figure here is measured off auracojewelry.com at viewport 1256. The
 * desktop frame is not square — it is `min(78vh, 860px)` tall with a fluid
 * width, and the rail matches that height and scrolls, showing exactly two
 * thumbnails at `calc(50% - 6.4px)` each. Below `lg` the reference collapses
 * to a square frame over an 80px horizontal strip.
 *
 * The main frame uses `object-contain`, not `object-cover` — a plain
 * product-on-white shot (a necklace's full chain + pendant, a pair of
 * earrings laid flat) needs to show the whole item uncropped regardless of
 * its aspect ratio; `cover` was clipping the bottom of pendant-style
 * necklaces against this frame's height. Thumbnails stay `object-cover
 * object-top` (small, cropping is far less noticeable, and it's what keeps
 * an on-model thumbnail from losing the model's head).
 */
export default function Gallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,68fr)_minmax(150px,32fr)] lg:gap-[clamp(0.65rem,1vw,1rem)]">
      {/* A product saved without images leaves images[active] undefined —
          show the tinted frame rather than a broken image. */}
      <button
        type="button"
        aria-label="View full-size image"
        onClick={() => images[active] && setLightboxOpen(true)}
        className="relative order-1 aspect-square overflow-hidden rounded-lg bg-[#f6f0e6] lg:aspect-auto lg:h-[min(78vh,860px)] lg:cursor-zoom-in"
      >
        {images[active] && (
          <Image
            src={images[active]}
            alt={name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-contain"
          />
        )}
      </button>

      {images.length > 1 && (
        <div className="order-2 flex flex-row gap-2 overflow-x-auto lg:h-[min(78vh,860px)] lg:flex-col lg:gap-[0.8vw] lg:overflow-x-visible lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={active === i ? "true" : undefined}
              onClick={() => setActive(i)}
              className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-[#f6f0e6] lg:aspect-auto lg:w-full lg:basis-[calc(50%_-_6.4px)]"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="240px"
                className="object-cover object-top"
              />
            </button>
          ))}
        </div>
      )}
      {lightboxOpen && (
        <Lightbox
          images={images}
          name={name}
          index={active}
          onIndexChange={setActive}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
