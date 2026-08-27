import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { journalPosts } from "@/data/site";

export function generateStaticParams() {
  return journalPosts.map((post) => ({ slug: post.slug }));
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = journalPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <div className="mx-auto max-w-[800px] px-6 py-16">
          <p className="text-xs tracking-wide text-gold mb-3">NEWS</p>
          <h1 className="font-serif-display text-4xl mb-3">{post.title}</h1>
          <p className="text-xs text-black/50 mb-8">{post.date}</p>
          <div className="relative aspect-[16/9] overflow-hidden mb-10">
            <Image
              src={post.img}
              alt={post.title}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <div>
            {post.body.map((paragraph, i) => (
              <p key={i} className="text-black/70 leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>
          <Link
            href="/news"
            className="inline-block mt-6 text-xs tracking-wide text-gold"
          >
            ← Back to journal
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
