"use client";

import Image from "next/image";
import Link from "next/link";
import { navLinks } from "@/data/site";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";

/**
 * "Shop by brand" rail that sits directly under the hero on
 * auracojewelry.com (`<section class="home-section home-section--brands">`
 * wrapping a `.home-brand-rail` grid of `.home-brand-card` tiles).
 *
 * Measured on the live site: 4 equal columns / 24px gap on desktop, 2
 * columns / 12.8px gap at 375px; each tile is a square (aspect-ratio 1/1)
 * cover image with a centered 26px Cormorant Garamond caption ~10px below
 * it, in normal case (not uppercase).
 *
 * The tile images are not their own entity in our data model (`category` is
 * just a column on `products`), so the page derives each tile's image from
 * the first product in that category and passes it in here — reordering
 * products in the admin catalog is what changes a tile.
 */
export const categoryRailKeys = [
  "necklaces",
  "bracelets",
  "earrings",
  "signatureSets",
] as const;

export type CategoryRailKey = (typeof categoryRailKeys)[number];

export type CategoryRailImages = Partial<Record<CategoryRailKey, string>>;

function isRailKey(key: string): key is CategoryRailKey {
  return (categoryRailKeys as readonly string[]).includes(key);
}

export default function CategoryRail({
  images = {},
}: {
  images?: CategoryRailImages;
}) {
  const dict = useDictionary();
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>();

  const railLinks = navLinks.filter((link) => isRailKey(link.key));

  return (
    <section
      ref={revealRef}
      aria-label="Shop by category"
      className={`mx-auto max-w-[1400px] px-4 py-[30px] sm:px-6 sm:py-14 ${revealClass}`}
    >
      <div role="list" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
        {railLinks.map((link) => {
          const key = link.key as CategoryRailKey;
          const label = dict.nav[key];
          const img = images[key];

          return (
            <Link
              key={key}
              role="listitem"
              href={link.href}
              className="group block text-center text-ink"
            >
              <span className="relative block aspect-square overflow-hidden bg-[#e9e4dc]">
                {img ? (
                  <Image
                    src={img}
                    alt={label}
                    fill
                    sizes="(min-width: 640px) 25vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : null}
              </span>
              <span className="font-serif-display mt-2.5 block text-[26px] leading-[1.15] font-normal normal-case tracking-normal text-ink transition-colors group-hover:text-gold">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
