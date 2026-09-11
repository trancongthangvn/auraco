import type { MetadataRoute } from "next";
import { serverApiFetch } from "@/lib/server-api";

const BASE_URL = "https://aura.maxmin.vn";

type ApiProductSlug = { slug: string };
type ApiCollectionSlug = { slug: string };
type ApiPostSlug = { slug: string };
type PostListResponse = { posts: ApiPostSlug[]; total: number };

/** Public posts endpoint caps at 100/page (server/routes/posts.js) — walked
 *  in pages rather than assumed to fit one request, with a generous safety
 *  cap so a future bug in `total` can't spin this into an infinite fetch
 *  loop against the live API on every sitemap request. */
async function fetchAllPostSlugs(): Promise<string[]> {
  const limit = 100;
  const maxPages = 50; // 5,000 posts — far past anything this store has
  const slugs: string[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const list = await serverApiFetch<PostListResponse>(
      `/api/content/posts?limit=${limit}&page=${page}`
    );
    slugs.push(...list.posts.map((p) => p.slug));
    if (slugs.length >= list.total || list.posts.length < limit) break;
  }
  return slugs;
}

/**
 * Contract line item 24 ("Tối ưu SEO cơ bản... sitemap.xml"). This used to
 * import the hard-coded sample arrays from data/products.ts and
 * data/site.ts (`force-static`, no live fetch at all) — accurate for the
 * 24 seed products the site launched with, but silently stale once the
 * catalog grew to 56 real products and real news posts replaced the sample
 * journal entries: the sitemap kept listing the old 22 sample product URLs
 * and zero real ones, and no /news/:slug URLs at all.
 *
 * Now reads the same public APIs the storefront pages themselves render
 * from, so every real product, active collection and published post is
 * covered and nothing has to be remembered to re-run at each catalog
 * change. No `dynamic` export: `serverApiFetch`'s `no-store` fetches
 * already make this route dynamic on their own (Next.js route handlers are
 * cached by default only when they use exclusively cached data — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/catalog",
    "/cart",
    "/login",
    "/register",
    "/news",
    "/pages/about",
    "/pages/contact",
    "/pages/privacy-policy",
    "/pages/security-policy",
    "/pages/return-policy",
    "/pages/terms-of-service",
    "/pages/track-order",
  ].map((path) => ({ url: `${BASE_URL}${path}` }));

  const [apiCollections, apiProducts, postSlugs] = await Promise.all([
    serverApiFetch<ApiCollectionSlug[]>("/api/collections").catch(
      () => [] as ApiCollectionSlug[]
    ),
    serverApiFetch<ApiProductSlug[]>("/api/products").catch(
      () => [] as ApiProductSlug[]
    ),
    fetchAllPostSlugs().catch(() => [] as string[]),
  ]);

  const collectionRoutes = apiCollections.map((c) => ({
    url: `${BASE_URL}/catalog/${c.slug}`,
  }));

  const productRoutes = apiProducts.map((p) => ({
    url: `${BASE_URL}/product/${encodeURIComponent(p.slug)}`,
  }));

  const journalRoutes = postSlugs.map((slug) => ({
    url: `${BASE_URL}/news/${encodeURIComponent(slug)}`,
  }));

  return [...staticRoutes, ...collectionRoutes, ...productRoutes, ...journalRoutes];
}
