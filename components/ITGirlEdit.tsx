"use client";

import { useEffect, useState } from "react";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";
import { apiFetch } from "@/lib/api";

const DEFAULT_IMAGE = "/images/pages/64e5ed6e-0491-4f3d-a678-b315945972da.png";
const DEFAULT_HEADING = "The IT-Girl Edit: Effortless Edge & Sterling Chic";
const DEFAULT_DESCRIPTION =
  "Redefine your everyday sparkle with pieces curated for the modern " +
  "trendsetter. Blending effortless streetwear cool with high-shine " +
  "sterling silver sophistication, this collection is designed for the " +
  "girl who sets the standard instead of following it. From coffee runs to VIP " +
  "nights out, make every look unforgettable.";

export default function ITGirlEdit() {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();
  const visible = revealClass.includes("is-visible");
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState({
    image: DEFAULT_IMAGE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
  });

  // Explicit request: this section had no admin control at all — image,
  // heading and description were hardcoded. Same public site-settings
  // endpoint + `extra` JSONB fallback pattern as deliveryReturnsItems
  // (server/routes/content.js) — each field falls back to the hardcoded
  // default above until an admin sets it, so existing content keeps
  // working with no migration needed.
  useEffect(() => {
    let cancelled = false;
    apiFetch<{
      itGirlEditImageUrl?: string | null;
      itGirlEditHeading?: string | null;
      itGirlEditDescription?: string | null;
    }>("/api/content/site-settings")
      .then((data) => {
        if (cancelled) return;
        setContent({
          image: data.itGirlEditImageUrl || DEFAULT_IMAGE,
          heading: data.itGirlEditHeading || DEFAULT_HEADING,
          description: data.itGirlEditDescription || DEFAULT_DESCRIPTION,
        });
      })
      .catch(() => {
        // Keep the defaults — decorative section, not worth an error state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      ref={revealRef}
      // Explicit request: the image was reading as too dominant/oversized
      // at desktop — it previously took every pixel left over from a fixed
      // 450px text column (`lg:flex-1` vs `lg:w-[450px]`). Flipped so the
      // image is now the fixed (smaller) column and the text is the one
      // that grows, matching the requested reference layout where the
      // photo is roughly a third of the row and the copy fills the rest.
      className="home-block mx-auto flex flex-col items-center gap-[clamp(1.5rem,4vw,48px)] bg-[#f5f5f5] md:grid md:grid-cols-2 md:items-stretch md:gap-[4vw] lg:flex lg:flex-row lg:items-center lg:gap-[clamp(1.5rem,4vw,48px)]"
    >
      {/* No forced aspect-ratio box: a fixed 16:9 crop-frame cropped nothing
          the wrong way relative to it (object-contain never crops), but it
          did letterbox any image whose own ratio wasn't 16:9, and an
          admin-uploaded image can be anything — portrait, square, ultra-
          wide. Sizing the box to the image's own intrinsic ratio (plain
          <img>, not next/image's fill mode, since admin uploads have no
          known width/height ahead of time) is the only way every upload
          renders whole and uncropped. max-height keeps a very tall upload
          from taking over the row. */}
      <div
        className={`w-full min-w-0 overflow-hidden rounded-[14px] md:flex md:h-full md:items-center md:justify-center lg:w-[38%] lg:shrink-0 reveal-from-start${
          visible ? " is-visible" : ""
        }`}
      >
        {content.image && (
          // eslint-disable-next-line @next/next/no-img-element -- intrinsic sizing for an admin-uploaded image of unknown dimensions
          <img
            src={content.image}
            alt={content.heading}
            className="block h-auto max-h-[500px] w-full object-contain md:h-full md:max-h-full md:w-auto lg:h-auto lg:max-h-[500px] lg:w-full"
          />
        )}
      </div>
      <div
        className={`w-full min-w-0 lg:flex-1 reveal-from-end${visible ? " is-visible" : ""}`}
      >
        <h2 className="font-serif-display mb-4 text-[clamp(1.5rem,2.6vw,32px)] font-normal leading-[1.25] text-[#28241f] md:text-[32px] md:leading-[1.1] lg:text-[clamp(1.5rem,2vw,32px)] lg:leading-[1.25]">
          {content.heading}
        </h2>
        {/* Collapsed to 2 lines with a Show more/less toggle only at tablet
            widths (`.home-stories__description-body.is-collapsed` on the
            reference, measured at 768px: 13px text clamped to exactly 2
            lines — 42.875px = 2 × 21.45px line-height). Mobile keeps its own
            16px size; desktop now scales up from the tablet-measured 13px
            since the text column is no longer squeezed into a fixed 450px —
            13px read too small once it had a whole wider column to sit in. */}
        <p
          className={`text-[16px] font-normal leading-[1.7] text-[#2b261f] md:text-[13px] md:leading-[1.65] lg:text-[15px] lg:leading-[1.7] ${
            expanded ? "" : "md:line-clamp-2 lg:line-clamp-none"
          }`}
        >
          {content.description}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 hidden text-[14.4px] font-semibold text-[#a67c3d] underline underline-offset-2 md:inline-block lg:hidden"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      </div>
    </section>
  );
}
