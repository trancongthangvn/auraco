import { notFound } from "next/navigation";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Gallery from "@/components/product/Gallery";
import AddToBag from "@/components/product/AddToBag";
import Description from "@/components/product/Description";
import Accordion from "@/components/product/Accordion";
import Reviews from "@/components/product/Reviews";
import FrequentlyBoughtTogether from "@/components/product/FrequentlyBoughtTogether";
import ProductCarousel from "@/components/ProductCarousel";
import type { FullProduct } from "@/data/products";
import type { Product as CarouselProduct } from "@/data/site";
import { serverApiFetch, ServerApiError } from "@/lib/server-api";
import { StarRating, SparkleIcon } from "@/components/icons";
import { toFullProduct, type ApiProduct } from "@/lib/catalog-mappers";
import { getServerDictionary } from "@/lib/i18n/server";

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

  const [rawBestSellers, rawRelated, bundle] = await Promise.all([
    fetchBestSellersRaw(product),
    fetchRelatedRaw(product),
    fetchBundle(product.slug),
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

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <nav className="px-4 pt-6 text-xs text-black/50">
          <span>{dict.product.breadcrumbHome}</span> / <span>{product.category}</span> /{" "}
          <span className="text-black">{product.name}</span>
        </nav>

        <div className="px-4 pt-6 pb-12 grid items-start gap-6 lg:gap-[clamp(2rem,3vw,4.5rem)] lg:grid-cols-[minmax(0,65fr)_minmax(300px,35fr)]">
          <Gallery images={product.images} name={product.name} />

          <div>
            <p className="font-ui text-[11.52px] uppercase leading-[17.856px] tracking-[1.6128px] text-gold mb-2">
              {product.category}
            </p>
            <h1 className="font-serif-display text-[34px] leading-[35.7px] text-[#2b261f] mt-1 mb-2">
              {product.name}
            </h1>
            {product.reviewCount > 0 && (
              <p className="flex items-center gap-[7.2px] mt-1 mb-3 text-[15.2px] leading-[23.56px] text-[#5c554a]">
                <StarRating rating={product.rating} size={16} />
                <span>
                  {product.rating.toFixed(1)} ({product.reviewCount} {dict.product.reviews})
                </span>
              </p>
            )}

            {/* The reference keeps the lead line, the copy and the feature
                bullets inside one clamped prose block, so "Read more" hides
                all three rather than the copy alone. */}
            <Description>
              <p className="font-bold">{dict.product.whyLoveIt}</p>
              <p className="whitespace-pre-line">{product.description}</p>
              {product.features.map((f) => (
                <p key={f} className="flex gap-2">
                  <SparkleIcon size={14} className="text-gold mt-1 shrink-0" />
                  {f}
                </p>
              ))}
            </Description>

            <AddToBag product={product} />

            <Accordion
              items={[
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
                  bulletItems: dict.product.deliveryReturnsItems,
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
          </div>
        </div>

        {bestSellers.length > 0 && (
          <ProductCarousel title={dict.product.bestSellers} products={bestSellers} />
        )}
        <ProductCarousel title={dict.product.youMayAlsoLike} products={related} />
        <Reviews product={product} />
      </main>
      <Footer />
    </>
  );
}
