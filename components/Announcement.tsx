"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import { renderPromoNumeric } from "@/lib/renderPromoNumeric";

export default function Announcement() {
  const dict = useDictionary();
  const [visible, setVisible] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);

  // Explicit request: this bar used to scroll away while Header (sticky
  // top-0) stayed pinned, so scrolling down lost the announcement entirely.
  // Sticky itself now, but Header's own `top` needs to sit exactly at this
  // bar's height rather than 0 so the two stack without overlapping — done
  // via a CSS var instead of a hard-coded pixel value so it keeps working
  // across locales (dict.announcement.signup's length varies per language
  // and can wrap to a second line on narrow screens) and instantly collapses
  // to 0 when this bar is dismissed via the close button below.
  useLayoutEffect(() => {
    if (!visible) {
      document.documentElement.style.setProperty("--announcement-h", "0px");
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const update = () =>
      document.documentElement.style.setProperty("--announcement-h", `${el.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  useLayoutEffect(() => {
    return () => {
      document.documentElement.style.setProperty("--announcement-h", "0px");
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-50 bg-[#2b261f] text-white text-center py-2 px-8"
    >
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("open-welcome-popup"))}
        className="text-[9px] uppercase tracking-[0.14em] hover:underline"
      >
        {renderPromoNumeric(dict.announcement.signup)}
      </button>
      <button
        aria-label="Dismiss announcement"
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
