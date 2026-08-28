import Image from "next/image";
import Link from "next/link";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
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

type PostCategory = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  post_count: number;
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

  const [list, categories] = await Promise.all([
    serverApiFetch<PostListResponse>(`/api/content/posts?${query.toString()}`),
    serverApiFetch<PostCategory[]>("/api/content/post-categories").catch(
      () => [] as PostCategory[]
    ),
  ]);

  const posts = list.posts ?? [];
  const total = list.total ?? posts.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const totalCount = categories.reduce((sum, c) => sum + Number(c.post_count || 0), 0);

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero title={dict.news.title} />
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          {categories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <Link
                href={buildUrl({ search })}
                className={`border px-4 py-2 text-xs uppercase tracking-wide transition-colors ${
                  !category
                    ? "border-gold text-gold"
                    : "border-black/10 text-black/60 hover:border-black/30"
                }`}
              >
                {dict.news.all}
                {totalCount > 0 ? ` (${totalCount})` : ""}
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={buildUrl({ category: c.slug, search })}
                  className={`border px-4 py-2 text-xs uppercase tracking-wide transition-colors ${
                    category === c.slug
                      ? "border-gold text-gold"
                      : "border-black/10 text-black/60 hover:border-black/30"
                  }`}
                >
                  {c.name} ({c.post_count})
                </Link>
              ))}
            </div>
          )}

          <form action="/news" className="flex justify-center mb-12">
            {category && <input type="hidden" name="category" value={category} />}
            <div className="flex w-full max-w-sm">
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder={dict.news.searchPlaceholder}
                className="flex-1 border border-black/10 bg-white px-4 py-2 text-sm focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                className="border border-l-0 border-black/10 px-4 py-2 text-xs uppercase tracking-wide text-black/60 hover:border-black/30"
              >
                {dict.news.searchButton}
              </button>
            </div>
          </form>

          {search && (
            <p className="text-sm text-black/50 mb-8 text-center">
              {dict.news.searchResultsFor} &ldquo;{search}&rdquo;
              {total > 0 ? ` — ${total} ${dict.news.searchResultsCount}` : ` — ${dict.news.noResultsSearch}`}
            </p>
          )}

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
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/news/${post.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden mb-4 bg-[#f7f4f0]">
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
                  <p className="text-xs text-black/50 mb-2">
                    {post.category_name && (
                      <span className="text-gold uppercase tracking-wide">
                        {post.category_name}
                      </span>
                    )}
                    {post.category_name && post.published_at && " · "}
                    {post.published_at &&
                      new Date(post.published_at).toLocaleDateString(dateLocale(locale))}
                  </p>
                  <h3 className="text-lg mb-2 leading-snug">{post.title}</h3>
                  <p className="text-sm text-black/70 mb-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs tracking-wide text-gold">
                    {dict.news.readMore} <ArrowRightIcon size={13} />
                  </span>
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
