import Image from "next/image";
import Link from "next/link";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { serverApiFetch } from "@/lib/server-api";
import { ArrowRightIcon } from "@/components/icons";
import { getServerDictionary } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/date-locale";

export const metadata = { title: "Journal | AURA & CO" };

type PostSummary = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  published_at: string;
  category_name: string | null;
  category_slug: string | null;
};

type PostListResponse = {
  posts: PostSummary[];
  total: number;
  page: number;
  limit: number;
};

const PER_PAGE = 12;

function buildUrl(params: { category?: string; search?: string; page?: number }): string {
  const q = new URLSearchParams();
  if (params.category) q.set("category", params.category);
  if (params.search) q.set("search", params.search);
  if (params.page && params.page > 1) q.set("page", String(params.page));
  const s = q.toString();
  return `/news${s ? `?${s}` : ""}`;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}) {
  const { category, search, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const { locale, dict } = await getServerDictionary();

  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (search) query.set("search", search);
  query.set("limit", String(PER_PAGE));
  query.set("page", String(page));

  const list = await serverApiFetch<PostListResponse>(
    `/api/content/posts?${query.toString()}`
  );

  const posts = list.posts ?? [];
  const total = list.total ?? posts.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <Announcement />
      <Header />
      <main className="px-4 pt-6 pb-12">
        <header className="mx-auto max-w-[543px] px-6 pt-12 pb-6">
          <h1 className="font-serif-display text-[38px] leading-[39.9px] font-normal tracking-[0.02em] text-[#2f2925]">
            {dict.news.title}
          </h1>
          <p className="font-ui mt-2 text-[14px] text-[#70675f]">{dict.news.subtitle}</p>
        </header>
        <div>
          {posts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-black/50">
                {search ? dict.news.noResultsSearch : dict.news.noResults}
              </p>
              {search && (
                <Link href="/news" className="inline-block mt-4 text-xs text-gold underline">
                  {dict.news.viewAll}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/news/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-gold-light/35 bg-white shadow-[0_18px_40px_rgba(43,38,31,0.08)]"
                >
                  <div className="relative aspect-square overflow-hidden bg-[#f7f4f0]">
                    {post.image_url && (
                      <Image
                        src={post.image_url}
                        alt={post.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-[17.6px] pt-4 pb-[18.4px]">
                    <p className="font-ui mb-[5.6px] text-[10px] leading-[15.5px] font-light tracking-[0.2px] text-[rgba(40,36,31,0.52)]">
                      {post.category_name && (
                        <span className="text-gold uppercase">{post.category_name}</span>
                      )}
                      {post.category_name && post.published_at && " · "}
                      {post.published_at &&
                        new Date(post.published_at).toLocaleDateString(dateLocale(locale))}
                    </p>
                    <h3 className="font-serif-display mb-[7.2px] line-clamp-2 text-[19.2px] leading-[29.76px] font-bold text-ink">
                      {post.title}
                    </h3>
                    <p className="font-ui mb-[10.4px] line-clamp-2 text-[12px] leading-[18.6px] font-light tracking-[0.06px] text-[#625d56]">
                      {post.excerpt}
                    </p>
                    <span className="font-ui mt-auto inline-flex items-center gap-1.5 self-start text-[11px] leading-[17.05px] font-normal tracking-[0.66px] text-[#8d6a37] uppercase">
                      {dict.news.readMore} <ArrowRightIcon size={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-16">
              {page > 1 && (
                <Link
                  href={buildUrl({ category, search, page: page - 1 })}
                  className="border border-black/10 px-4 py-2 text-xs uppercase tracking-wide text-black/60 hover:border-black/30"
                >
                  {dict.news.prev}
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildUrl({ category, search, page: p })}
                  className={`h-9 w-9 flex items-center justify-center text-xs border transition-colors ${
                    p === page
                      ? "border-gold text-gold"
                      : "border-black/10 text-black/60 hover:border-black/30"
                  }`}
                >
                  {p}
                </Link>
              ))}
              {page < totalPages && (
                <Link
                  href={buildUrl({ category, search, page: page + 1 })}
                  className="border border-black/10 px-4 py-2 text-xs uppercase tracking-wide text-black/60 hover:border-black/30"
                >
                  {dict.news.next}
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
