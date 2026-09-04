import { Fragment, type ReactNode } from "react";

/** Wraps any "<digits>%" run (e.g. "10%") in a span forcing lining,
 *  proportional numerals — matching the reference's own `.promo-numeric`
 *  span (used in both its announcement bar and footer newsletter heading).
 *  Without it, a serif/display font's default (often oldstyle,
 *  uneven-baseline) figures make the digits look like a different font
 *  than the all-caps text around them. */
export function renderPromoNumeric(text: string): ReactNode[] {
  return text.split(/(\d+%)/g).map((part, i) =>
    /^\d+%$/.test(part) ? (
      <span key={i} className="[font-variant-numeric:lining-nums_proportional-nums]">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}
