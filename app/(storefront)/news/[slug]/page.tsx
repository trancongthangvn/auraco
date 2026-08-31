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

type RelatedPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  published_at: string;
  category_name: string | null;
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

async function fetchRelated(slug: string): Promise<RelatedPost[]> {
  try {
    const list = await serverApiFetch<RelatedPost[]>(
      `/api/content/posts/${encodeURIComponent(slug)}/related`
    );
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
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

  const related = await fetchRelated(slug);
  const views = Number(post.views || 0);
  const { locale, dict } = await getServerDictionary();

  return (
    <>
      <Announcement />
      <Header />
      <main className="px-4 pt-6 pb-12">
        <article>
          <header className="mx-auto max-w-[543px] px-6 pt-12 pb-6">
            <p className="mb-2 text-[11.52px] leading-[17.856px] tracking-[0.18em] text-gold uppercase">
              {post.category_name || dict.nav.news}
            </p>
            <h1 className="font-serif-display mb-2 text-[38px] leading-[39.9px] font-normal tracking-[0.02em] text-[#2f2925]">
              {post.title}
            </h1>
            <p className="font-ui text-[14px] leading-[22.4px] font-light tracking-[0.21px] text-[#70675f]">
              {post.published_at &&
                new Date(post.published_at).toLocaleDateString(dateLocale(locale))}
              {views > 0 && (
                <>
                  {post.published_at && " · "}
                  {views.toLocaleString(dateLocale(locale))} {dict.news.views}
                </>
              )}
            </p>
          </header>

          {post.image_url && (
            <div className="relative mb-10 aspect-[16/9] min-h-[440px] overflow-hidden bg-[#f7f4f0]">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          )}

          {post.excerpt && (
            <p className="font-serif-display mx-auto mb-10 max-w-[800px] text-xl leading-relaxed text-black/70">
              {post.excerpt}
            </p>
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
              className="article-content prose mx-auto max-w-[800px]
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

          <p className="mx-auto my-4 max-w-[800px]">
            <Link
              href="/news"
              className="font-ui inline-flex items-center rounded-full border border-gold-light/35 bg-white px-5 py-[10.4px] text-[12px] leading-[18.6px] font-light tracking-[0.12px] text-[#68625c] transition-colors hover:text-ink"
            >
              ← {dict.news.backToJournal}
            </Link>
          </p>
        </article>

        {related.length > 0 && (
          <section className="border-t border-black/10 bg-[#f7f4f0]">
            <div className="mx-auto px-6 py-16">
              <h2 className="font-serif-display text-2xl mb-8 text-center">
                {dict.news.relatedTitle}
              </h2>
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
                {related.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/news/${item.slug}`}
                    className="group block overflow-hidden rounded-[14px] border border-gold-light/35 bg-white shadow-[0_18px_40px_rgba(43,38,31,0.08)]"
                  >
                    <div className="relative aspect-[5/3] overflow-hidden bg-white">
                      {item.image_url && (
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="px-[17.6px] pt-4 pb-[18.4px]">
                      <p className="font-ui mb-[5.6px] text-[10px] leading-[15.5px] font-light tracking-[0.2px] text-[rgba(40,36,31,0.52)]">
                        {item.category_name && (
                          <span className="text-gold uppercase">{item.category_name}</span>
                        )}
                        {item.category_name && item.published_at && " · "}
                        {item.published_at &&
                          new Date(item.published_at).toLocaleDateString(dateLocale(locale))}
                      </p>
                      <h3 className="font-serif-display text-[19.2px] leading-[29.76px] font-bold text-ink">
                        {item.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
