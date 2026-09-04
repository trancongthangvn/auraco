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
    case "en": {
      // Also used for GBP in the currency picker. User-supplied artwork,
      // nested at its native 60×30 (2:1) viewBox like the USD flag above.
      const sClip = `${clipId}-s`;
      const tClip = `${clipId}-t`;
      return (
        <svg {...common}>
          <svg viewBox="0 0 60 30" width="60" height="40" preserveAspectRatio="none">
            <clipPath id={sClip}>
              <path d="M0,0 v30 h60 v-30 z" />
            </clipPath>
            <clipPath id={tClip}>
              <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
            </clipPath>
            <g clipPath={`url(#${sClip})`}>
              <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
              <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
              <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${tClip})`} stroke="#C8102E" strokeWidth="4" />
              <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
              <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
            </g>
          </svg>
        </svg>
      );
    }

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
      // Explicit request: the full 50-star flag artwork the user supplied,
      // not the previous placeholder (13 stripes + a plain navy rectangle
      // with no stars at all). Nested as its own <svg> at the artwork's
      // native 7410×3900 viewBox rather than hand-converting every star
      // coordinate to the 60×40 system the other flags share — the outer
      // <svg>'s common.viewBox already scales this inner one to line up
      // with the rest of the list.
      return (
        <svg {...common}>
          <svg viewBox="0 0 7410 3900" width="60" height="40" preserveAspectRatio="none">
            <path d="M0,0h7410v3900H0" fill="#b31942" />
            <path d="M0,450H7410m0,600H0m0,600H7410m0,600H0m0,600H7410m0,600H0" stroke="#FFF" strokeWidth="300" />
            <path d="M0,0h2964v2100H0" fill="#0a3161" />
            <g fill="#FFF">
              <g id="us-flag-s18">
                <g id="us-flag-s9">
                  <g id="us-flag-s5">
                    <g id="us-flag-s4">
                      <path id="us-flag-s" d="M247,90 317.534230,307.082039 132.873218,172.917961H361.126782L176.465770,307.082039z" />
                      <use xlinkHref="#us-flag-s" y="420" />
                      <use xlinkHref="#us-flag-s" y="840" />
                      <use xlinkHref="#us-flag-s" y="1260" />
                    </g>
                    <use xlinkHref="#us-flag-s" y="1680" />
                  </g>
                  <use xlinkHref="#us-flag-s4" x="247" y="210" />
                </g>
                <use xlinkHref="#us-flag-s9" x="494" />
              </g>
              <use xlinkHref="#us-flag-s18" x="988" />
              <use xlinkHref="#us-flag-s9" x="1976" />
              <use xlinkHref="#us-flag-s5" x="2470" />
            </g>
          </svg>
        </svg>
      );

    case "eu":
      // User-supplied artwork, nested at its native 900×600 (3:2) viewBox
      // like the USD/GBP flags above.
      return (
        <svg {...common}>
          <svg viewBox="0 0 900 600" width="60" height="40">
            <rect width="900" height="600" fill="#039" />
            <g fill="#fc0" transform="translate(450,300)">
              <path
                id="eu-flag-s"
                d="M0,162.5 22.041947,230.338137 -35.664619,188.411863H35.664619L-22.041947,230.338137z"
              />
              <use xlinkHref="#eu-flag-s" y="-400" />
              <g id="eu-flag-s5">
                <use xlinkHref="#eu-flag-s" transform="rotate(30) rotate(-30,0,200)" />
                <use xlinkHref="#eu-flag-s" transform="rotate(60) rotate(-60,0,200)" />
                <use xlinkHref="#eu-flag-s" transform="rotate(90) rotate(-90,0,200)" />
                <use xlinkHref="#eu-flag-s" transform="rotate(120) rotate(-120,0,200)" />
                <use xlinkHref="#eu-flag-s" transform="rotate(150) rotate(-150,0,200)" />
              </g>
              <use xlinkHref="#eu-flag-s5" transform="scale(-1,1)" />
            </g>
          </svg>
        </svg>
      );
  }
}
