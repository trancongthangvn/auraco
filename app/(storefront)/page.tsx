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
};

type ApiCollection = {
  id: number;
  slug: string;
  name: string;
  image_url: string | null;
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
    rating: Math.round(Number(p.rating)),
    img: p.images[0],
  }));
}

// The homepage category rail has no per-category image in our data model
// (`category` is just a column on `products`), so each tile borrows the first
// image of the newest product in that category — the shop owner changes a tile
// by reordering/adding products in the admin catalog.
const categoryRailSources: { key: CategoryRailKey; category: string }[] = [
  { key: "necklaces", category: "Necklaces" },
  { key: "bracelets", category: "Bracelets" },
  { key: "earrings", category: "Earrings" },
  { key: "signatureSets", category: "Signature Sets" },
];

async function loadCategoryRailImages(): Promise<CategoryRailImages> {
  const entries = await Promise.all(
    categoryRailSources.map(async ({ key, category }) => {
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
    newArrivalsApi,
    allProductsApi,
  ] = await Promise.all([
    serverApiFetch<{
      heroSlides: ApiHeroSlide[];
      testimonials: ApiTestimonial[];
      featuredProducts: unknown[];
    }>("/api/content/homepage"),
    serverApiFetch<ApiCollection[]>("/api/collections"),
    loadCategoryRailImages(),
    serverApiFetch<PressMention[]>("/api/press-mentions").catch(
      () => [] as PressMention[]
    ),
    serverApiFetch<ApiProduct[]>("/api/products?collection=BEACH-VIBE").catch(
      () => [] as ApiProduct[]
    ),
    serverApiFetch<ApiProduct[]>("/api/products?collection=NEW-ARRIVALS").catch(
      () => [] as ApiProduct[]
    ),
    serverApiFetch<ApiProduct[]>("/api/products").catch(() => [] as ApiProduct[]),
  ]);

  const beachVibeProducts = toCarouselProducts(beachVibeApi);
  const newArrivalProducts = toCarouselProducts(newArrivalsApi);

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

  const testimonials: Testimonial[] = homepage.testimonials.map((t) => ({
    initials: t.initials,
    name: t.name,
    date: formatQuoteDate(t.quote_date),
    quote: t.quote,
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
          title="BEACH VIBE"
          subtitle="Sun-drenched styles for endless summer days. Discover lightweight pieces designed to catch the coastal light."
          products={beachVibeProducts}
        />
        <ProductCarousel title="NEW ARRIVALS" products={newArrivalProducts} />
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
