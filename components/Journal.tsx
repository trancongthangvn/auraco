"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { journalPosts } from "@/data/site";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { useRevealOnScroll } from "@/components/useRevealOnScroll";

export default function Journal() {
  const [revealRef, revealClass] = useRevealOnScroll<HTMLElement>({ fadeOnly: true });
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByPage = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section
      ref={revealRef}
      className={`home-block mx-auto ${revealClass}`}
    >
      <div>
        <div className="mb-4 flex items-center justify-center gap-4">
          <h2 className="font-serif-display section-title !mb-0">Journal</h2>
          <Link
            href="/news"
            className="font-ui text-[12px] font-light text-[#68625c] transition-colors hover:text-ink"
          >
            View more
          </Link>
        </div>
        <div className="relative">
          <div
            ref={scrollerRef}
            className="grid grid-flow-col auto-cols-[100%] sm:auto-cols-[calc(50%-8.5px)] gap-[17px] overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {journalPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/news/${post.slug}`}
                className="group flex h-full flex-col snap-start overflow-hidden rounded-[14px] bg-white shadow-[0_18px_40px_rgba(43,38,31,0.08)]"
              >
                <div className="relative h-[350px] overflow-hidden lg:h-[650px]">
                  <Image
                    src={post.img}
                    alt={post.title}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col pb-[18.4px] pl-[17.6px] pr-[17.6px] pt-[16px]">
                  <p className="font-ui mb-[5.6px] text-[10px] font-light leading-[15.5px] text-[rgba(40,36,31,0.52)]">{post.date}</p>
                  <h3 className="font-serif-display mb-[7.2px] line-clamp-2 text-[19.2px] font-bold leading-[29.76px] text-[#2b261f]">
                    {post.title}
                  </h3>
                  <p className="font-ui mb-[10.4px] line-clamp-2 text-[12px] font-light leading-[18.6px] text-[#625d56]">
                    {post.excerpt}
                  </p>
                  <span className="font-ui mt-auto inline-flex items-center gap-1.5 self-start text-[11px] font-normal uppercase leading-[17.05px] tracking-wide text-[#8d6a37] transition-[gap,color] duration-300 hover:gap-3 hover:text-ink">
                    READ MORE <ArrowRightIcon size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {journalPosts.length > 2 && (
            <>
              <button
                aria-label="Previous journal posts"
                onClick={() => scrollByPage(-1)}
                className="hidden sm:flex absolute -left-5 top-[calc(37.5%-18px)] z-20 items-center justify-center h-9 w-9 rounded-full bg-white shadow transition-colors hover:bg-[#f5f2ee] hover:text-gold"
              >
                <ChevronLeftIcon size={16} />
              </button>
              <button
                aria-label="Next journal posts"
                onClick={() => scrollByPage(1)}
                className="hidden sm:flex absolute -right-5 top-[calc(37.5%-18px)] z-20 items-center justify-center h-9 w-9 rounded-full bg-white shadow transition-colors hover:bg-[#f5f2ee] hover:text-gold"
              >
                <ChevronRightIcon size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
