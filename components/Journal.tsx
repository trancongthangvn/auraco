import Image from "next/image";
import Link from "next/link";
import { journalPosts } from "@/data/site";
import { ArrowRightIcon } from "@/components/icons";

export default function Journal() {
  return (
    <section className="bg-[#f7f4f0] py-16">
      <div className="mx-auto max-w-[1400px] px-6">
        <h2 className="font-serif-display text-3xl text-center mb-10">
          Journal
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {journalPosts.map((post) => (
            <Link key={post.slug} href={`/news/${post.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden mb-4">
                <Image
                  src={post.img}
                  alt={post.title}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p className="text-xs text-black/50 mb-2">{post.date}</p>
              <h3 className="text-lg mb-2 leading-snug">{post.title}</h3>
              <p className="text-sm text-black/70 mb-3 leading-relaxed">
                {post.excerpt}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs tracking-wide text-gold">
                READ MORE <ArrowRightIcon size={13} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
