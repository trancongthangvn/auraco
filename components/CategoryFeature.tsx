"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * Full-bleed collection feature that sits between the New Arrivals heading and
 * its product grid, matching the reference site's `.home-category-feature`:
 * a 16:7 photo linking to the collection, with the collection name and lede
 * set in white over its bottom-left corner.
 *
 * Values are the reference's own: 16/7 media, body inset 1rem, title 42px/400
 * at line-height 1.05, description 13px/300 capped at 520px. The gradient is
 * ours — the reference relies on its artwork being dark enough on the left,
 * which is not a safe assumption once the shop owner swaps the image.
 */
export default function CategoryFeature({
  href,
  title,
  description,
  image,
}: {
  href: string;
  title: string;
  description: string;
  image: string;
}) {
  return (
    <Link href={href} className="group/banner relative block overflow-hidden text-white">
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-[#e9e4dc]">
        {/* The image is admin-editable, so an empty value must not render a
            broken frame. */}
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover/banner:scale-[1.04]"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pb-4 pt-24" />
      </div>

      <div className="absolute bottom-4 left-4 max-w-[min(34rem,100%-2rem)]">
        <h3 className="font-serif-display text-[clamp(1.35rem,4.5vw,42px)] font-normal leading-[1.05] text-white">
          {title}
        </h3>
        <p className="font-ui mt-2 max-w-[520px] text-[13px] font-light leading-[1.5] tracking-[0.01em] text-white/[0.94]">
          {description}
        </p>
      </div>
    </Link>
  );
}
