"use client";

import { useEffect, useRef, useState } from "react";
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
 * The reference site (auracojewelry.com) itself does NOT auto-scroll this —
 * measured directly, at both mobile and desktop widths, with real gradual
 * scrolling into view and several seconds of continuous watching: its
 * scrollLeft never moves on its own. This auto-scroll is a deliberate
 * departure from that, per explicit request (confirmed after flagging the
 * measured discrepancy) — the owner wants the animated version regardless.
 *
 * Driven by requestAnimationFrame rather than a CSS animation: a CSS
 * keyframe here was silently switched off for anyone whose OS asks for
 * reduced motion — Windows' "Animation effects" toggle does exactly that.
 * Scrolling the container instead keeps the marquee running everywhere,
 * still lets the visitor drag or wheel through the logos, and pauses on
 * hover.
 */
export default function AsSeenIn({ mentions }: { mentions: PressMention[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const oneGroupRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  // How many copies of the logo row to render. Fixed at 2 originally — fine
  // at narrow widths where two copies already overflow the visible strip,
  // but on a wide screen (or the browser zoomed OUT, which hands the page
  // more CSS pixels) two copies can fit entirely within the container with
  // nothing left to scroll. `el.scrollLeft = offset` is then a no-op (there
  // is no overflow to scroll into), which reads as the marquee having
  // simply stopped — explicit report: "shrinks the window and it spins,
  // enlarges it and it doesn't". Recomputed on resize so it keeps enough
  // copies to overflow at any width, not just the one measured on mount.
  const [groupCount, setGroupCount] = useState(2);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const oneGroup = oneGroupRef.current;
    if (!scroller || !oneGroup || mentions.length === 0) return;

    const recompute = () => {
      const groupWidth = oneGroup.scrollWidth;
      if (groupWidth <= 0) return;
      // 3x the visible width as a buffer, so the strip stays comfortably
      // overflowing even if the window is dragged wider afterward — not
      // just barely past the edge, which would make the loop feel abrupt.
      const target = scroller.clientWidth * 3;
      const needed = Math.max(2, Math.ceil(target / groupWidth));
      // Must stay even: the reset-by-half trick below relies on group 0..N/2
      // being pixel-identical to group N/2..N, which only holds for an even
      // copy count of the same repeating unit.
      setGroupCount(needed % 2 === 0 ? needed : needed + 1);
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [mentions.length]);

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

      // The track holds an even number of identical groups, so resetting by
      // half its width is invisible regardless of how many groups that is.
      const half = el.scrollWidth / 2;
      if (!pausedRef.current && half > 0) {
        offset = (offset + SPEED * dt) % half;
        el.scrollLeft = offset;
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [mentions.length, groupCount]);

  if (mentions.length === 0) return null;

  const groups = Array.from({ length: groupCount }, (_, i) => i);

  // Padding-based tile, not a flex `gap` — matches the reference's own
  // `.home-certificates-marquee__item` (`padding: 8px 17.6px`, no gap
  // between tiles), which is what actually produces the ~35px visual gap
  // between most logos (a fixed-width centering box, tried earlier, made
  // that gap read as wildly uneven since logo art has very different
  // amounts of built-in transparent padding per asset).
  const logo = (m: PressMention, group: number) => (
    <article
      key={`${group}-${m.id}`}
      className="flex shrink-0 items-center justify-center px-[17.6px] py-2"
    >
      {m.logo_url ? (
        <Image
          src={m.logo_url}
          alt={m.name}
          width={220}
          height={112}
          draggable={false}
          className="h-auto max-h-20 w-auto max-w-full object-contain"
        />
      ) : (
        <span className="font-serif-display text-2xl tracking-[0.12em] uppercase text-ink/70">
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
          // Pointer events, gated to pointerType === "mouse": a touch tap
          // fires a synthetic `mouseenter` (to emulate hover) with no
          // matching `mouseleave` afterwards — there's no real pointer to
          // "leave" with — so on a phone/tablet the very first tap anywhere
          // on this strip paused the scroll for good, while desktops (real
          // mouse, real leave events) kept running. That's why the same
          // page looked auto-scrolling on some devices and frozen on
          // others. Restricting the pause/resume to real mouse pointers
          // keeps the hover-to-pause behavior for desktop while touch
          // devices always keep scrolling.
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") pausedRef.current = true;
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") pausedRef.current = false;
          }}
          className="overflow-x-auto overflow-y-hidden py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max">
            {groups.map((group) => (
              <div
                key={group}
                ref={group === 0 ? oneGroupRef : undefined}
                className="flex shrink-0 items-center"
                aria-hidden={group === 0 ? undefined : true}
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
