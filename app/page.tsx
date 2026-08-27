import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Hero, { type HeroSlide } from "@/components/Hero";
import Collections, { type CollectionTile } from "@/components/Collections";
import ProductCarousel from "@/components/ProductCarousel";
import Testimonials, { type Testimonial } from "@/components/Testimonials";
import TrustBadges from "@/components/TrustBadges";
import ITGirlEdit from "@/components/ITGirlEdit";
import Journal from "@/components/Journal";
import Footer from "@/components/Footer";
import type { Product as CarouselProduct } from "@/data/site";
import { serverApiFetch } from "@/lib/server-api";
import type { ApiProduct } from "@/lib/catalog-mappers";

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

function formatQuoteDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default async function Home() {
  const [homepage, collections, beachVibeApi, newArrivalsApi] = await Promise.all([
    serverApiFetch<{
      heroSlides: ApiHeroSlide[];
      testimonials: ApiTestimonial[];
      featuredProducts: unknown[];
    }>("/api/content/homepage"),
    serverApiFetch<ApiCollection[]>("/api/collections"),
    serverApiFetch<ApiProduct[]>("/api/products?collection=BEACH-VIBE").catch(
      () => [] as ApiProduct[]
    ),
    serverApiFetch<ApiProduct[]>("/api/products?collection=NEW-ARRIVALS").catch(
      () => [] as ApiProduct[]
    ),
  ]);

  const beachVibeProducts = toCarouselProducts(beachVibeApi);
  const newArrivalProducts = toCarouselProducts(newArrivalsApi);

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
        <Collections collections={collectionTiles} />
        <ProductCarousel
          title="BEACH VIBE"
          subtitle="Sun-drenched styles for endless summer days. Discover lightweight pieces designed to catch the coastal light."
          products={beachVibeProducts}
        />
        <ProductCarousel title="NEW ARRIVALS" products={newArrivalProducts} />
        <Testimonials testimonials={testimonials} />
        <TrustBadges />
        <ITGirlEdit />
        <Journal />
      </main>
      <Footer />
    </>
  );
}
