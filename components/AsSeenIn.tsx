"use client";

import Image from "next/image";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";

export type PressMention = {
  id: number;
  name: string;
  logo_url: string | null;
};

/**
 * "As Seen In" press-logo marquee, matching auracojewelry.com's own
 * `.home-section--certificates` block (white background, centered Cormorant
 * Garamond title, then a continuously scrolling row of outlet logos). The
 * track holds two identical groups so the -50% translate loop reads as one
 * seamless strip; keyframes + the reduced-motion override live in
 * app/globals.css.
 */
export default function AsSeenIn({ mentions }: { mentions: PressMention[] }) {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();

  if (mentions.length === 0) return null;

  const groups = [0, 1];

  return (
    <section
      ref={revealRef}
      className={`bg-white ${revealClass}`}
      aria-label="As Seen In"
    >
      <h2 className="font-serif-display text-[2.35rem] font-bold text-center text-ink mb-4">
        As Seen In
      </h2>
      <div className="home-certificates-marquee overflow-x-auto overflow-y-hidden py-1">
        <div className="home-certificates-marquee__track flex">
          {groups.map((group) => (
            <div
              key={group}
              className="home-certificates-marquee__group flex shrink-0 items-center"
              aria-hidden={group === 1 ? true : undefined}
            >
              {mentions.map((m) => (
                <article
                  key={`${group}-${m.id}`}
                  className="home-certificates-marquee__item flex h-24 w-[200px] shrink-0 items-center justify-center px-6"
                >
                  {m.logo_url ? (
                    <Image
                      src={m.logo_url}
                      alt={m.name}
                      width={200}
                      height={120}
                      loading="lazy"
                      draggable={false}
                      className="home-certificates-marquee__img h-full w-auto max-w-full object-contain"
                    />
                  ) : (
                    <span className="font-serif-display text-lg tracking-[0.12em] uppercase text-ink/70">
                      {m.name}
                    </span>
                  )}
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
