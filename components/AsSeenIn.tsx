"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export type PressMention = {
  id: number;
  name: string;
  logo_url: string | null;
};

/**
 * "As Seen In" press-logo strip: a boxed white panel on the tinted page
 * background with the outlet logos looping endlessly from right to left.
 *
 * The loop is driven by requestAnimationFrame rather than a CSS animation.
 * A CSS keyframe here was silently switched off for anyone whose OS asks for
 * reduced motion — Windows' "Animation effects" toggle does exactly that, and
 * it left the site owner staring at a static strip. Scrolling the container
 * instead keeps the marquee running everywhere, still lets the visitor drag
 * or wheel through the logos, and pauses on hover.
 */
export default function AsSeenIn({ mentions }: { mentions: PressMention[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || mentions.length === 0) return;

    let frame = 0;
    let last = 0;
    // Offset is tracked here rather than read back from scrollLeft: the
    // browser rounds that property, so a sub-pixel per-frame increment gets
    // rounded away and the strip never moves.
    let offset = 0;
    const SPEED = 40; // px per second

    const step = (now: number) => {
      if (last === 0) last = now;
      const dt = (now - last) / 1000;
      last = now;

      // The track holds two identical groups, so resetting by half its width
      // is invisible.
      const half = el.scrollWidth / 2;
      if (!pausedRef.current && half > 0) {
        offset = (offset + SPEED * dt) % half;
        el.scrollLeft = offset;
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [mentions.length]);

  if (mentions.length === 0) return null;

  const groups = [0, 1];

  const logo = (m: PressMention, group: number) => (
    <article
      key={`${group}-${m.id}`}
      className="flex h-24 w-[190px] shrink-0 items-center justify-center px-6"
    >
      {m.logo_url ? (
        <Image
          src={m.logo_url}
          alt={m.name}
          width={190}
          height={96}
          draggable={false}
          className="h-auto max-h-14 w-auto max-w-full object-contain"
        />
      ) : (
        <span className="font-serif-display text-lg tracking-[0.12em] uppercase text-ink/70">
          {m.name}
        </span>
      )}
    </article>
  );

  return (
    <section className="home-block mx-auto" aria-label="As Seen In">
      {/* Full-bleed and untinted: the strip spans the viewport instead of the
          usual 1400px shell, and sits directly on the page so the bands above
          and below it don't box it in. */}
      <div className="w-full bg-white">
        <h2 className="font-serif-display section-title">
          As Seen In
        </h2>

        <div
          ref={scrollerRef}
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
          className="overflow-x-auto overflow-y-hidden py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max">
            {groups.map((group) => (
              <div
                key={group}
                className="flex shrink-0 items-center"
                aria-hidden={group === 1 ? true : undefined}
              >
                {mentions.map((m) => logo(m, group))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
