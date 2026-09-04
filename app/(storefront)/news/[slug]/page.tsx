import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { serverApiFetch, ServerApiError } from "@/lib/server-api";
import { getServerDictionary } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/date-locale";

type PostDetail = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  published_at: string;
  category_name: string | null;
  category_slug: string | null;
  views: number | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
};

async function fetchPost(slug: string): Promise<PostDetail | null> {
  try {
    return await serverApiFetch<PostDetail>(
      `/api/content/posts/${encodeURIComponent(slug)}`
    );
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return { title: "AURA & CO" };

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || undefined;
  const image = post.og_image || post.image_url;

  return {
    title: `${title} | AURA & CO`,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      url: `/news/${post.slug}`,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await fetchPost(slug);
  if (!post) notFound();

  const { locale, dict } = await getServerDictionary();

  return (
    <>
      <Announcement />
      <Header />
      <main className="px-4 pt-6 pb-12">
        <article>
          {/* Explicit request, two rounds: (1) this block sits flush against
              the page's left edge, matching where the article's image/
              content below it already start — not centered as its own
              island the way `mx-auto` had it (the reference site does
              center it, the owner wants this deliberately different); (2)
              no `max-w` either, so the title now wraps at the same width as
              the full-bleed image below instead of a narrower fixed column
              — lines fill out toward the right edge like ordinary prose
              instead of wrapping early and leaving a ragged gap. */}
          <header className="px-6 pt-12 pb-6">
            <p className="mb-2 text-[11.52px] leading-[17.856px] tracking-[0.18em] text-gold uppercase">
              {post.category_name || dict.nav.news}
            </p>
            <h1 className="font-serif-display mb-2 text-[38px] leading-[39.9px] font-normal tracking-[0.02em] text-[#2f2925]">
              {post.title}
            </h1>
            <p className="font-ui text-[14px] leading-[22.4px] font-light tracking-[0.21px] text-[#70675f]">
              {post.published_at &&
                new Date(post.published_at).toLocaleDateString(dateLocale(locale), {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
            </p>
          </header>

          {/* min-h only from sm: up — combined with aspect-[16/9] on a
              narrow mobile viewport, a 440px floor forces the browser to
              widen the box (not just heighten it) to hold the ratio,
              overflowing the page horizontally. At sm+ the container is
              already wide enough that 16:9 alone clears 440px, so the
              min-h there is a no-op safety net, not a real constraint. */}
          {post.image_url && (
            <div className="relative mb-10 aspect-[16/9] sm:min-h-[440px] overflow-hidden bg-[#f7f4f0]">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          )}

          {/*
            `content` is HTML produced by the admin rich text editor. It is
            sanitized SERVER-SIDE ON WRITE (server/lib/sanitize-html.js strips
            <script>/<iframe> except allow-listed embeds, on* handlers and
            javascript: URLs) before it is ever stored, so rendering it here
            with dangerouslySetInnerHTML is intentional and not unguarded.
          */}
          {post.content && (
            <div
              className="article-content prose max-w-none
                prose-headings:font-serif-display prose-headings:font-normal prose-headings:text-ink
                prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-black/70 prose-p:leading-relaxed
                prose-a:text-gold prose-a:no-underline hover:prose-a:underline
                prose-strong:text-ink prose-strong:font-medium
                prose-li:text-black/70 prose-li:leading-relaxed
                prose-blockquote:border-l-2 prose-blockquote:border-gold
                prose-blockquote:not-italic prose-blockquote:font-serif-display
                prose-blockquote:text-lg prose-blockquote:text-black/70
                prose-hr:border-black/10 prose-hr:my-12
                prose-img:w-full prose-img:my-8
                prose-figcaption:text-xs prose-figcaption:text-black/50"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          )}

          <p className="my-4">
            <Link
              href="/news"
              className="font-ui inline-flex items-center rounded-full px-5 py-[10.4px] text-[12px] leading-[18.6px] font-light tracking-[0.12px] text-[#68625c] transition-colors hover:text-ink"
            >
              ← {dict.news.backToJournal}
            </Link>
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
