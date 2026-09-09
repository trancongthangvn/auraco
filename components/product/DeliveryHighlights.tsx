"use client";

import { useEffect, useState } from "react";

/**
 * The site-wide "Giao hàng & Đổi trả" lines (admin: Cài đặt web, stored as
 * site_settings.extra.delivery_returns_items) shown as a single rotating
 * line directly under Add to Bag / Buy Now — explicit request with a
 * screenshot of the same treatment on the reference storefront.
 *
 * Same source list the "Delivery & Returns" accordion row below already
 * renders in full; this is a second, more prominent view of it, not a new
 * setting — editing the list in the admin moves both at once.
 *
 * Every line is rendered stacked in ONE grid cell rather than swapping a
 * single node's text, so the box is always as tall as the longest line and
 * rotating never shifts the buttons or the accordion beneath it.
 */
export default function DeliveryHighlights({ items }: { items: string[] }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 4000);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  const active = index % count;

  return (
    <div className="mt-4">
      <div className="grid rounded-[10px] bg-[#f6f0e6] px-5 py-3 text-center">
        {items.map((item, i) => (
          <p
            key={item}
            aria-hidden={i === active ? undefined : true}
            className={`[grid-area:1/1] self-center font-ui text-[13px] leading-[20px] tracking-[0.02em] text-[#2b261f] transition-opacity duration-500 ${
              i === active ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {item}
          </p>
        ))}
      </div>

      {count > 1 && (
        // Same dot treatment as the carousels elsewhere on the site
        // (ProductCarousel/VideoCarousel): 10px, brand gold, active one
        // scaled up rather than recoloured.
        <div className="mt-[10px] flex items-center justify-center gap-[7.2px]">
          {items.map((item, i) => (
            <button
              key={item}
              type="button"
              aria-label={`Show highlight ${i + 1} of ${count}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => setIndex(i)}
              className={`h-[10px] w-[10px] rounded-full bg-[#a67c3d] transition-[transform,opacity] duration-300 hover:opacity-70 ${
                i === active ? "scale-[1.15]" : "scale-100 opacity-[0.28]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
