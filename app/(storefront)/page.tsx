import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Hero, { type HeroSlide } from "@/components/Hero";
import CategoryRail, {
  type CategoryRailImages,
  type CategoryRailKey,
} from "@/components/CategoryRail";
import AsSeenIn, { type PressMention } from "@/components/AsSeenIn";
import Collections, { type CollectionTile } from "@/components/Collections";
import ProductCarousel from "@/components/ProductCarousel";
import VideoCarousel from "@/components/VideoCarousel";
import Testimonials, { type Testimonial } from "@/components/Testimonials";
import TrustBadges from "@/components/TrustBadges";
import ITGirlEdit from "@/components/ITGirlEdit";
import Journal from "@/components/Journal";
import Footer from "@/components/Footer";
import type { Product as CarouselProduct } from "@/data/site";
import { serverApiFetch } from "@/lib/server-api";
import { toFullProduct, type ApiProduct } from "@/lib/catalog-mappers";
// Fallback only — for any testimonial an admin hasn't set a real photo_url
// for yet, borrow one of these on-model shots by position rather than show
// a blank card.
const TESTIMONIAL_PHOTOS = [
  "/images/products/imported/09cc71d8476343cca31538ff35842330.webp",
  "/images/products/imported/bd4c07cbdf55464f93499767a3e9905e.webp",
  "/images/products/imported/502c9cd87d1848849d03e79dbaecfe82.webp",
  "/images/products/imported/b80b434ec6cc425d995b2ecc8767c97c.webp",
  "/images/products/imported/35115fb1c6f64907a2c1bcf3597d0cce.webp",
  "/images/products/imported/2103924f79864c16964d7bb16327ca81.webp",
];

type ApiHeroSlide = {
  id: number;
  label: string;
  title: string;
  href: string;
  image_url: string;
  sort_order: number;
};

type ApiTestimonial = {
  id: number;
  initials: string;
  name: string;
  quote: string;
  quote_date: string;
  sort_order: number;
  photo_url: string | null;
  rating: number;
};

type ApiCollection = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  banner_url: string | null;
  href: string | null;
  sort_order: number;
  active: boolean;
};

function toCarouselProducts(list: ApiProduct[]): CarouselProduct[] {
  return list.map((p) => ({
    name: p.name,
    href: `/product/${p.slug}`,
    material: p.material,
    price: `$${Number(p.price).toFixed(2)} USD`,
    priceValue: Number(p.price),
    rating: Math.round(Number(p.rating)),
    img: p.images[0],
    hoverImg: p.images[1],
  }));
}

// The reference site's rail tile is a fixed, dedicated image
// (/storage/brands/<uuid>) completely independent of the product catalog —
// not derived from any product. brands.image_url (migration 010) mirrors
// that. Falls back to the old "first product in category with an image"
// derivation only for a brand an admin hasn't set a real image_url for yet,
// so a fresh category never renders a blank tile.
const categoryRailSources: { key: CategoryRailKey; category: string; brandSlug: string }[] = [
  { key: "necklaces", category: "Necklaces", brandSlug: "Necklaces" },
  { key: "bracelets", category: "Bracelets", brandSlug: "Bracelets" },
  { key: "earrings", category: "Earrings", brandSlug: "Earrings" },
  { key: "signatureSets", category: "Signature Sets", brandSlug: "Signature-Sets" },
];

async function loadCategoryRailImagesForHomepage(): Promise<CategoryRailImages> {
  const brands = await serverApiFetch<{ slug: string; image_url: string | null }[]>(
    "/api/brands"
  ).catch(() => []);
  return loadCategoryRailImages(brands);
}

async function loadCategoryRailImages(
  brands: { slug: string; image_url: string | null }[]
): Promise<CategoryRailImages> {
  const entries = await Promise.all(
    categoryRailSources.map(async ({ key, category, brandSlug }) => {
      const fixedImage = brands.find((b) => b.slug === brandSlug)?.image_url;
      if (fixedImage) return [key, fixedImage] as const;

      const products = await serverApiFetch<ApiProduct[]>(
        `/api/products?category=${encodeURIComponent(category)}`
      ).catch(() => [] as ApiProduct[]);
      const withImage = products.find((p) => p.images && p.images.length > 0);
      return [key, withImage?.images[0]] as const;
    })
  );
  return Object.fromEntries(
    entries.filter((e): e is [CategoryRailKey, string] => Boolean(e[1]))
  );
}

function formatQuoteDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default async function Home() {
  const [
    homepage,
    collections,
    categoryRailImages,
    pressMentions,
    beachVibeApi,
    allProductsApi,
    newArrivalsCollection,
  ] = await Promise.all([
    serverApiFetch<{
      heroSlides: ApiHeroSlide[];
      testimonials: ApiTestimonial[];
      featuredProducts: unknown[];
    }>("/api/content/homepage"),
    serverApiFetch<ApiCollection[]>("/api/collections"),
    loadCategoryRailImagesForHomepage(),
    serverApiFetch<PressMention[]>("/api/press-mentions").catch(
      () => [] as PressMention[]
    ),
    serverApiFetch<ApiProduct[]>("/api/products?collection=BEACH-VIBE").catch(
      () => [] as ApiProduct[]
    ),
    serverApiFetch<ApiProduct[]>("/api/products").catch(() => [] as ApiProduct[]),
    // The "NEW ARRIVALS" feature block below (image/description/link) used
    // to be hardcoded here — bug report: an admin found and successfully
    // edited the "New Arrivals" row in /admin/collections, but nothing on
    // the homepage ever changed, since this block never read from it. This
    // collection row is deliberately inactive (kept out of the public
    // /api/collections list and the Collections rail/catalog nav, which is
    // for generically browsable tiles), so it's fetched directly by slug via
    // the single-collection endpoint instead. `.catch(() => null)` plus the
    // `??` fallbacks below mean a missing row or an admin who hasn't set a
    // field yet still renders the original hardcoded content, not a blank
    // section.
    serverApiFetch<ApiCollection>("/api/collections/NEW-ARRIVALS").catch(() => null),
  ]);

  // Six tiles, as on the reference — the collection holds more than fit.
  const newArrivalProducts = toCarouselProducts(beachVibeApi).slice(0, 6);

  // Only products the shop owner has attached a video to; VideoCarousel
  // renders nothing at all when this is empty.
  const videoProducts = allProductsApi
    .filter((p) => Boolean(p.video_url))
    .map(toFullProduct);

  const heroSlides: HeroSlide[] = homepage.heroSlides.map((s) => ({
    label: s.label,
    title: s.title,
    href: s.href,
    img: s.image_url,
  }));

  // Explicit request: the homepage Feedback section shows only the 5 most
  // recent testimonials, not every active one an admin has ever added — the
  // admin's own sort_order (used to hand-arrange display order) is kept for
  // ordering AMONG those 5 once picked, but which 5 make the cut is decided
  // by quote_date instead. `/api/content/homepage` itself stays unchanged
  // (still returns every active testimonial, sort_order-ordered) since the
  // admin/homepage management page reads the exact same endpoint to list
  // and edit ALL of them — slicing there would make testimonials beyond the
  // top 5 unreachable to manage.
  const latestFiveTestimonials = [...homepage.testimonials]
    .sort((a, b) => new Date(b.quote_date).getTime() - new Date(a.quote_date).getTime())
    .slice(0, 5)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  const testimonials: Testimonial[] = latestFiveTestimonials.map((t, i) => ({
    initials: t.initials,
    name: t.name,
    date: formatQuoteDate(t.quote_date),
    quote: t.quote,
    // Real per-reviewer photo when the admin has set one; otherwise borrow
    // an on-model shot by position rather than show a blank card.
    photo: t.photo_url || TESTIMONIAL_PHOTOS[i % TESTIMONIAL_PHOTOS.length],
    rating: t.rating,
  }));

  const collectionTiles: CollectionTile[] = collections.map((c) => ({
    name: c.name.toUpperCase(),
    href: c.href || `/catalog/${c.slug}`,
    img: c.image_url || "",
  }));

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <Hero slides={heroSlides} />
        <CategoryRail images={categoryRailImages} />
        <AsSeenIn mentions={pressMentions} />
        <Collections collections={collectionTiles} />
        <ProductCarousel
          title="NEW ARRIVALS"
          products={newArrivalProducts}
          layout="grid"
          feature={{
            href: newArrivalsCollection?.href || "/catalog/BEACH-VIBE",
            title: (newArrivalsCollection?.name || "BEACH VIBE").toUpperCase(),
            description:
              newArrivalsCollection?.description ||
              "Sun-drenched styles for endless summer days. Discover lightweight pieces designed to catch the coastal light.",
            image:
              newArrivalsCollection?.banner_url ||
              newArrivalsCollection?.image_url ||
              "/images/settings/home-product-sections/a4975173-b51a-4180-89db-b79a72e73c03.webp",
          }}
        />
        <VideoCarousel products={videoProducts} />
        <Testimonials testimonials={testimonials} />
        <TrustBadges />
        <ITGirlEdit />
        <Journal />
      </main>
      <Footer />
    </>
  );
}
