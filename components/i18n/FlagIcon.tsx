"use client";

import { useId } from "react";
import type { Locale } from "@/lib/i18n/config";

/** Locale flags plus the two extra flags the currency picker needs — GBP
 *  reuses "en" (same Union Jack), EUR and USD have no locale equivalent. */
export type FlagKind = Locale | "us" | "eu";

/**
 * Country flags for the language switcher, drawn as inline SVG.
 *
 * Not emoji: Windows ships no glyphs for regional-indicator pairs, so 🇬🇧 and
 * friends render as bare letter boxes there — and Windows is what the shop
 * owner uses. SVG renders identically everywhere and needs no font.
 *
 * All five share a 3:2 field (viewBox 0 0 60 40) so they line up in the list.
 */
export default function FlagIcon({
  locale,
  className = "",
}: {
  locale: FlagKind;
  className?: string;
}) {
  // The Union Jack needs a clip path, and the flag renders more than once per
  // page (trigger + list row), so the id has to be unique per instance.
  const clipId = useId();

  const common = {
    viewBox: "0 0 60 40",
    className: `shrink-0 rounded-[1px] ${className}`,
    "aria-hidden": true as const,
  };

  switch (locale) {
    case "en":
      return (
        <svg {...common}>
          <clipPath id={clipId}>
            <path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z" />
          </clipPath>
          <rect width="60" height="40" fill="#00247d" />
          <path d="M0,0 L60,40 M60,0 L0,40" fill="none" stroke="#fff" strokeWidth="8" />
          <path
            d="M0,0 L60,40 M60,0 L0,40"
            fill="none"
            clipPath={`url(#${clipId})`}
            stroke="#cf142b"
            strokeWidth="5"
          />
          <path d="M30,0 v40 M0,20 h60" fill="none" stroke="#fff" strokeWidth="13" />
          <path d="M30,0 v40 M0,20 h60" fill="none" stroke="#cf142b" strokeWidth="8" />
        </svg>
      );

    case "fr":
      return (
        <svg {...common}>
          <rect width="20" height="40" fill="#002395" />
          <rect x="20" width="20" height="40" fill="#fff" />
          <rect x="40" width="20" height="40" fill="#ed2939" />
        </svg>
      );

    case "de":
      return (
        <svg {...common}>
          <rect width="60" height="13.34" fill="#000" />
          <rect y="13.34" width="60" height="13.33" fill="#dd0000" />
          <rect y="26.67" width="60" height="13.33" fill="#ffce00" />
        </svg>
      );

    case "es":
      // Spain's bands are 1:2:1, not equal thirds.
      return (
        <svg {...common}>
          <rect width="60" height="40" fill="#aa151b" />
          <rect y="10" width="60" height="20" fill="#f1bf00" />
        </svg>
      );

    case "it":
      return (
        <svg {...common}>
          <rect width="20" height="40" fill="#008c45" />
          <rect x="20" width="20" height="40" fill="#f4f5f0" />
          <rect x="40" width="20" height="40" fill="#cd212a" />
        </svg>
      );

    case "us":
      return (
        <svg {...common}>
          <rect width="60" height="40" fill="#b22234" />
          {[1, 3, 5, 7, 9, 11].map((i) => (
            <rect key={i} y={i * (40 / 13)} width="60" height={40 / 13} fill="#fff" />
          ))}
          <rect width="24" height="21.6" fill="#3c3b6e" />
        </svg>
      );

    case "eu":
      return (
        <svg {...common}>
          <rect width="60" height="40" fill="#003399" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const cx = 30 + Math.cos(a) * 12;
            const cy = 20 + Math.sin(a) * 12;
            return (
              <path
                key={i}
                fill="#ffcc00"
                transform={`translate(${cx},${cy}) scale(0.32)`}
                d="M0,-6 1.76,-1.85 6,-1.85 2.65,0.7 3.7,5 0,2.3 -3.7,5 -2.65,0.7 -6,-1.85 -1.76,-1.85Z"
              />
            );
          })}
        </svg>
      );
  }
}
