"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fade+slide-up reveal on scroll, matching auracojewelry.com's own
 * `.reveal-on-scroll` treatment (measured via getComputedStyle on the live
 * site): opacity 0 -> 1 with translateY(34px) -> translateY(0). CSS for the
 * `.reveal-on-scroll` / `.reveal-on-scroll.is-visible` classes — including a
 * prefers-reduced-motion override — lives in app/globals.css.
 *
 * Returns `[ref, className]` (destructure at the call site rather than
 * keeping the returned object around) so each consumer just spreads its own
 * `ref`/`className` locals into JSX.
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>(
  opts: { fadeOnly?: boolean } = {}
): [React.RefObject<T | null>, string] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const className = `reveal-on-scroll${opts.fadeOnly ? " reveal-on-scroll--fade-only" : ""}${
    visible ? " is-visible" : ""
  }`;

  return [ref, className];
}
