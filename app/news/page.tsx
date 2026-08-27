import Image from "next/image";
import Link from "next/link";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { journalPosts } from "@/data/site";

export const metadata = { title: "Journal | AURA & CO" };

export default function NewsPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero title="Journal" />
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {journalPosts.map((post) => (
              <Link key={post.slug} href={`/news/${post.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden mb-4">
                  <Image
                    src={post.img}
                    alt={post.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="text-xs text-black/50 mb-2">{post.date}</p>
                <h3 className="text-lg mb-2 leading-snug">{post.title}</h3>
                <p className="text-sm text-black/70 mb-3 leading-relaxed">
                  {post.excerpt}
                </p>
                <span className="text-xs tracking-wide text-gold">
                  READ MORE →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
