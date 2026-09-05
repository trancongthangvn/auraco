import { notFound } from "next/navigation";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Gallery from "@/components/product/Gallery";
import AddToBag from "@/components/product/AddToBag";
import VariantProvider from "@/components/product/VariantProvider";
import Accordion from "@/components/product/Accordion";
import Reviews from "@/components/product/Reviews";
import FrequentlyBoughtTogether from "@/components/product/FrequentlyBoughtTogether";
import SeeItIRL from "@/components/product/SeeItIRL";
import ProductCarousel from "@/components/ProductCarousel";
import type { FullProduct } from "@/data/products";
import type { Product as CarouselProduct } from "@/data/site";
import { serverApiFetch, ServerApiError } from "@/lib/server-api";
import { StarRating } from "@/components/icons";
import { toFullProduct, type ApiProduct } from "@/lib/catalog-mappers";
import { getServerDictionary } from "@/lib/i18n/server";

/** Admin-editable, site-wide (same for every product) — falls back to the
 *  hard-coded dictionary copy until an admin saves a list of their own (see
 *  app/admin/cai-dat-web/page.tsx). */
async function fetchSiteSettings(): Promise<{
  deliveryReturnsItems: string[] | null;
  whyLoveItLabel: string | null;
}> {
  try {
    return await serverApiFetch<{
      deliveryReturnsItems: string[] | null;
      whyLoveItLabel: string | null;
    }>("/api/content/site-settings");
  } catch {
    return { deliveryReturnsItems: null, whyLoveItLabel: null };
  }
}

async function fetchProduct(slug: string): Promise<FullProduct | null> {
  // A handful of real product slugs (e.g. "Aura-&-CO") carry a URI-reserved
  // character. Next.js 16 doesn't reliably hand generateMetadata and the page
  // component the same raw/decoded form of such a slug — one call's
  // encodeURIComponent(slug) has produced a 404 against our own API while the
  // other succeeded for the identical route hit, confirmed by our own API
  // accepting both the raw and %-encoded form every time it was tried
  // directly. Retrying with the untouched slug (instead of digging further
  // into that framework inconsistency) rescues those products without
  // affecting the other slugs, which never need the fallback.
  const attempts = [encodeURIComponent(slug), slug];
  for (const attempt of attempts) {
    try {
      const api = await serverApiFetch<ApiProduct>(`/api/products/${attempt}`);
      return toFullProduct(api);
    } catch (err) {
      if (err instanceof ServerApiError && err.status === 404) continue;
      throw err;
    }
  }
  return null;
}

// The reference product page runs two distinct carousels — Best sellers
// (store-wide, independent of the product being viewed) above You may also
// like (collection/category-scoped) — which our page was missing entirely.
async function fetchBestSellersRaw(product: FullProduct): Promise<ApiProduct[]> {
  let list: ApiProduct[] = [];
  try {
    list = await serverApiFetch<ApiProduct[]>(
      `/api/products?collection=${encodeURIComponent("BEST-SELLERS")}`
    );
  } catch {
    list = [];
  }
  return list.filter((p) => p.slug !== product.slug);
}

async function fetchRelatedRaw(product: FullProduct): Promise<ApiProduct[]> {
  const firstCollection = product.collections[0];

  let list: ApiProduct[] = [];
  try {
    if (firstCollection) {
      list = await serverApiFetch<ApiProduct[]>(
        `/api/products?collection=${encodeURIComponent(firstCollection)}`
      );
    } else {
      const all = await serverApiFetch<ApiProduct[]>("/api/products");
      list = all.filter((p) => p.category === product.category);
    }
  } catch {
    list = [];
  }

  return list.filter((p) => p.slug !== product.slug);
}

function toCarouselProducts(list: ApiProduct[]): CarouselProduct[] {
  return list.slice(0, 8).map((p) => ({
    name: p.name,
    href: `/product/${p.slug}`,
    material: p.material,
    price: `$${Number(p.price).toFixed(2)} USD`,
    priceValue: Number(p.price),
    rating: Math.round(Number(p.rating)),
    img: p.images[0],
    hoverImg: p.images[1],
    badgeLabel: p.badge_label ?? undefined,
  }));
}

function toFrequentlyBoughtCompanions(list: ApiProduct[]) {
  return list.slice(0, 2).map((p) => ({
    slug: p.slug,
    name: p.name,
    price: Number(p.price),
    compareAtPrice:
      p.compare_at_price != null ? Number(p.compare_at_price) : undefined,
    image: p.images[0],
  }));
}

type BundleApiResponse = {
  discountPercent: number;
  companions: {
    slug: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    image?: string;
  }[];
};

/** Admin-picked "frequently bought together" companions and bundle discount
 *  (see server/routes/products.js's /:slug/bundle). Falls back to the old
 *  auto-derived (same-collection) companions with no discount whenever an
 *  admin hasn't configured a bundle for this product yet, so the panel keeps
 *  working for every product that hasn't been curated. */
async function fetchBundle(slug: string): Promise<BundleApiResponse> {
  try {
    return await serverApiFetch<BundleApiResponse>(
      `/api/products/${encodeURIComponent(slug)}/bundle`
    );
  } catch {
    return { discountPercent: 0, companions: [] };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  return { title: product ? `${product.name} | AURA & CO` : "AURA & CO" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();

  const [rawBestSellers, rawRelated, bundle, siteSettings] = await Promise.all([
    fetchBestSellersRaw(product),
    fetchRelatedRaw(product),
    fetchBundle(product.slug),
    fetchSiteSettings(),
  ]);
  const bestSellers = toCarouselProducts(rawBestSellers);
  const related = toCarouselProducts(rawRelated);
  const frequentlyBoughtCompanions =
    bundle.companions.length > 0
      ? bundle.companions.map((c) => ({
          slug: c.slug,
          name: c.name,
          price: c.price,
          compareAtPrice: c.compareAtPrice ?? undefined,
          image: c.image,
        }))
      : toFrequentlyBoughtCompanions(rawRelated);
  const bundleDiscountPercent = bundle.companions.length > 0 ? bundle.discountPercent : 0;
  const { dict } = await getServerDictionary();

  // "See It IRL" auto-advances through videos of similar products (same
  // collection/category as the one being viewed, via fetchRelatedRaw) once
  // the current clip ends — the current product's own video plays first,
  // then whichever related products have one, deduped and capped so the
  // loop doesn't grow unbounded on a big collection.
  const seeItIrlVideos = [
    product.videoUrl
      ? { slug: product.slug, name: product.name, videoUrl: product.videoUrl, thumbnail: product.thumbnailUrl || product.images[0] }
      : null,
    ...rawRelated
      .filter((p) => p.video_url && p.slug !== product.slug)
      .slice(0, 9)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        videoUrl: p.video_url as string,
        thumbnail: p.thumbnail_url || p.images[0],
      })),
  ].filter((v): v is { slug: string; name: string; videoUrl: string; thumbnail: string } => v !== null);

  return (
    <>
      <Announcement />
      <Header />
      <main>
        {/* max-w-[1740px] mx-auto — explicit request, measured against a
            1920×1080 @100% reference screenshot: the whole product-detail
            block (gallery + info) used to run edge-to-edge (just the 16px
            px-4 gutter), reading as no margin at all on a wide monitor.
            Wraps both the breadcrumb and the grid below so they stay
            aligned with each other rather than only capping one. Composes
            with Gallery's own internal max-w cap (750px → 900px, same
            change) rather than replacing it: that cap still protects the
            mosaic from over-stretching/over-cropping on viewports between
            ~1024px and this new 1740px ceiling, where the page-level
            max-width doesn't engage yet. */}
        <div className="mx-auto max-w-[1740px]">
        <nav className="px-4 pt-6 text-xs text-black/50">
          <span>{dict.product.breadcrumbHome}</span> / <span>{product.category}</span> /{" "}
          <span className="text-black">{product.name}</span>
        </nav>

        <VariantProvider variants={product.variants ?? []}>
        <div className="px-4 pt-6 pb-12 grid grid-cols-1 items-start gap-6 lg:gap-[clamp(2rem,3vw,4.5rem)] lg:grid-cols-[minmax(0,65fr)_minmax(300px,35fr)]">
          <Gallery images={product.images} name={product.name} />

          <div>
            <p className="font-ui text-[11.52px] uppercase leading-[17.856px] tracking-[1.6128px] text-gold mb-3">
              {product.collections[0]?.replace(/-/g, " ") ?? product.category}
            </p>
            <h1 className="font-serif-display text-[34px] leading-[35.7px] text-[#2b261f] mt-1 mb-3">
              {product.name}
            </h1>
            {product.shortDescription && (
              <p className="text-[15px] leading-[22px] text-[#5c554a] mb-3">
                {product.shortDescription}
              </p>
            )}
            {/* Always shown, like the reference — a product with no reviews
                yet still gets the dimmed 5-star row (StarRating renders
                every star at opacity-[0.35] when rating is 0), not a gap
                where the rating would be. */}
            <p className="flex items-center gap-[7.2px] mt-1 mb-3 text-[15.2px] leading-[23.56px] text-[#5c554a]">
              <StarRating rating={product.rating} size={16} />
              <span>{product.rating.toFixed(1)}</span>
            </p>

            <div id="add-to-bag-anchor">
              <AddToBag product={product} />
            </div>

            {/* "Why You'll Love It" used to render always-expanded, no
                toggle, right above Add to Bag (explicit request at the
                time). Reversed on a later explicit request to match
                missoma.com's own product page instead, which collapses it
                into the same accordion as Details/Delivery & Returns,
                closed by default like every other row there (confirmed
                live: all of Missoma's rows start collapsed). */}
            <Accordion
              items={[
                // Explicit request: the admin's single description box
                // (which only ever fed this one fixed row) is now a
                // repeatable list of {title, content} rows, each its own
                // accordion entry here — an admin can add as many named
                // sections as a product needs. Falls back to the old
                // single-row shape (product.description under the site-wide
                // "Why You'll Love It" label) for any product that hasn't
                // been given rows yet, so nothing already live changes
                // until an admin actually edits that product.
                ...(product.descriptionSections && product.descriptionSections.length > 0
                  ? product.descriptionSections.map((section) => ({
                      title: section.title,
                      content: section.content,
                    }))
                  : [
                      {
                        // Trailing ":" (the punctuation made sense as an
                        // always-visible lead-in line, less so as a
                        // standalone accordion row title alongside
                        // "Details"/"Delivery & Returns", neither of which
                        // has one) is stripped only for this display — the
                        // admin-set/dictionary value itself is untouched.
                        title: (siteSettings.whyLoveItLabel || dict.product.whyLoveIt).replace(/:\s*$/, ""),
                        content: product.description,
                      },
                    ]),
                product.detailsHtml
                  ? {
                      title: dict.product.details,
                      content: product.detailsHtml,
                      html: true,
                    }
                  : {
                      title: dict.product.details,
                      content:
                        (product.attributes && product.attributes.length > 0
                          ? product.attributes
                              .map((a) => `${a.name}: ${a.value}`)
                              .join("\n")
                          : `${dict.product.material}: ${product.material}`) +
                        `\n\n${dict.product.handFinishedNote}`,
                    },
                {
                  title: dict.product.deliveryReturns,
                  content: "",
                  bulletItems:
                    siteSettings.deliveryReturnsItems && siteSettings.deliveryReturnsItems.length > 0
                      ? siteSettings.deliveryReturnsItems
                      : dict.product.deliveryReturnsItems,
                },
              ]}
            />

            <FrequentlyBoughtTogether
              mainProduct={{
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: product.images[0],
              }}
              companions={frequentlyBoughtCompanions}
              discountPercent={bundleDiscountPercent}
            />

            <SeeItIRL videos={seeItIrlVideos} />
          </div>
        </div>
        </VariantProvider>
        </div>

        {bestSellers.length > 0 && (
          <ProductCarousel title={dict.product.bestSellers} products={bestSellers} centerTitle />
        )}
        <ProductCarousel title={dict.product.youMayAlsoLike} products={related} centerTitle />
        <Reviews product={product} />
      </main>
      <Footer />
    </>
  );
}
