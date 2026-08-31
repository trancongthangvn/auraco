"use client";

import Image from "next/image";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";
import { VerifiedBadgeIcon } from "@/components/icons";

export type Testimonial = {
  initials: string;
  name: string;
  date: string;
  quote: string;
  photo?: string;
};

/** Star row, drawn to the reference's `.home-feedback-card__stars` spec:
 *  12px glyphs on a 24 viewBox with a 1.5px stroke in the fill colour and a
 *  0.8px gap, lit ones #f0b429 against #e0d5c0 for the rest. The stroke is
 *  what gives them their weight — without it they read thin and small. */
function Stars({ filled = 5 }: { filled?: number }) {
  return (
    <span className="flex items-center justify-center gap-[0.8px]" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={i < filled ? "text-[#f0b429]" : "text-[#e0d5c0]"}
        >
          <path
            d="M12 2l2.95 6.6 7.05.7-5.3 4.92 1.55 7.18L12 17.85 5.75 21.4 7.3 14.22 2 9.3l7.05-.7L12 2z"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

/**
 * Customer feedback cards. Every value here — the square photo, the 1.65rem
 * avatar straddling its lower edge, the 11px/300 quote clamped to four lines,
 * the 12px stars — is taken from the reference site's own
 * `.home-feedback-card` rules rather than eyeballed, so the cards match at
 * any width.
 */
export default function Testimonials({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();

  return (
    <section
      ref={revealRef}
      className={`home-block mx-auto ${revealClass}`}
    >
      <div>
        <h2 className="font-serif-display section-title">Feedback</h2>

        {/* One unbroken row of six, per the reference site — the cards go
            narrow rather than wrapping, and narrow viewports scroll instead. */}
        <div className="flex gap-[7px] overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {testimonials.map((t) => (
            <div
              key={t.name + t.date}
              className="flex w-[220px] shrink-0 flex-col overflow-hidden rounded-lg bg-white text-center shadow-[0_4px_16px_rgba(31,26,20,0.06)] sm:w-auto sm:flex-1 sm:basis-0 sm:min-w-[150px]"
            >
              {/* Square photo, as on the reference. A testimonial saved
                  without one falls back to the tinted box. */}
              <div className="relative aspect-[12/25] w-full bg-[#e9e4dc]">
                {t.photo && (
                  <Image
                    src={t.photo}
                    alt={t.name}
                    fill
                    sizes="(min-width: 640px) 17vw, 220px"
                    className="object-cover"
                  />
                )}
                <span className="absolute -bottom-[0.825rem] left-1/2 z-10 flex h-[1.65rem] w-[1.65rem] -translate-x-1/2 items-center justify-center rounded-full bg-[#ece9e4] text-[0.65rem] font-bold tracking-[0.02em] text-[#1f1a14] shadow-[0_1px_4px_rgba(31,26,20,0.08)]">
                  {t.initials}
                  <VerifiedBadgeIcon
                    size={14}
                    className="absolute -bottom-[1px] -right-[3px] drop-shadow-[0_1px_2px_rgba(31,26,20,0.25)]"
                  />
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-[3.2px] pb-[11.2px] pl-[9.6px] pr-[9.6px] pt-[19.2px]">
                <p className="font-ui text-[12px] font-medium leading-[15.6px] text-[#28241f]">{t.name}</p>
                <p className="font-ui text-[10px] font-light leading-[15.5px] tracking-[0.02em] text-[rgba(40,36,31,0.45)]">
                  {t.date}
                </p>
                {/* Four-line clamp, matching the reference, so a long quote
                    can never push the star row out of line across the row. */}
                <p className="font-ui line-clamp-4 text-[11px] font-light leading-[1.55] tracking-[0.005em] text-[#4f4a44]">
                  {t.quote}
                </p>
                <span className="mt-auto flex h-[27px] items-center justify-center">
                  <Stars />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
