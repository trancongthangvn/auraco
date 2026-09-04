"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The clamped description block with its Read more / Read less toggle.
 *
 * The reference clamps to two lines and puts the whole prose blob — lead line,
 * copy and feature bullets alike — inside that clamp, so callers pass the
 * paragraphs as children rather than the block owning any one of them. The
 * toggle only appears when the copy is actually clipped, so short descriptions
 * do not grow a dead control.
 *
 * Type is measured off auracojewelry.com: paragraphs 14px/400 Jost, tracking
 * 0.14px, line-height 23.1px, 14px apart; the toggle 11px uppercase gold.
 */
export default function Description({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div className="mt-8">
      <div
        ref={ref}
        className={`font-ui text-[14px] leading-[23.1px] tracking-[0.14px] text-[#302c27] [&>*]:mb-[14px] [&>*:last-child]:mb-0 ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {children}
      </div>
      {(clipped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 font-ui text-[11px] uppercase leading-[17.05px] tracking-[0.88px] text-gold underline transition-opacity hover:opacity-70"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}
