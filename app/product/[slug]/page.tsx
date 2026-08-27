import { notFound } from "next/navigation";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Gallery from "@/components/product/Gallery";
import AddToBag from "@/components/product/AddToBag";
import Accordion from "@/components/product/Accordion";
import Reviews from "@/components/product/Reviews";
import ProductCarousel from "@/components/ProductCarousel";
import type { FullProduct } from "@/data/products";
import type { Product as CarouselProduct } from "@/data/site";
import { serverApiFetch, ServerApiError } from "@/lib/server-api";
import { StarRating, SparkleIcon } from "@/components/icons";
import { toFullProduct, type ApiProduct } from "@/lib/catalog-mappers";

async function fetchProduct(slug: string): Promise<FullProduct | null> {
  try {
    const api = await serverApiFetch<ApiProduct>(
      `/api/products/${encodeURIComponent(slug)}`
    );
    return toFullProduct(api);
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) return null;
    throw err;
  }
}

async function fetchRelated(product: FullProduct): Promise<CarouselProduct[]> {
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

  return list
    .filter((p) => p.slug !== product.slug)
    .slice(0, 8)
    .map((p) => ({
      name: p.name,
      href: `/product/${p.slug}`,
      material: p.material,
      price: `$${Number(p.price).toFixed(2)} USD`,
      rating: Math.round(Number(p.rating)),
      img: p.images[0],
    }));
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

  const related = await fetchRelated(product);

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <nav className="mx-auto max-w-[1400px] px-6 pt-6 text-xs text-black/50">
          <span>Home</span> / <span>{product.category}</span> /{" "}
          <span className="text-black">{product.name}</span>
        </nav>

        <div className="mx-auto max-w-[1400px] px-6 py-10 grid gap-10 lg:grid-cols-2">
          <Gallery images={product.images} name={product.name} />

          <div>
            <p className="text-xs tracking-wide text-black/50 mb-2 uppercase">
              {product.category}
            </p>
            <h1 className="font-serif-display text-3xl mb-2">
              {product.name}
            </h1>
            {product.reviewCount > 0 && (
              <p className="flex items-center gap-2 text-sm mb-6">
                <StarRating rating={product.rating} size={14} />
                <span className="text-black/50">
                  {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                </span>
              </p>
            )}

            <p className="text-sm font-medium mb-2">Why You&apos;ll Love It:</p>
            <p className="text-sm text-black/70 leading-relaxed whitespace-pre-line mb-4">
              {product.description}
            </p>
            <ul className="space-y-2 mb-8">
              {product.features.map((f) => (
                <li key={f} className="text-sm text-black/70 flex gap-2">
                  <SparkleIcon size={14} className="text-gold mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <AddToBag product={product} />

            <Accordion
              items={[
                {
                  title: "Details",
                  content:
                    (product.attributes && product.attributes.length > 0
                      ? product.attributes
                          .map((a) => `${a.name}: ${a.value}`)
                          .join("\n")
                      : `Material: ${product.material}`) +
                    "\n\nEvery piece is finished by hand and inspected for quality before it ships.",
                },
                {
                  title: "Delivery & Returns",
                  content:
                    "Free delivery on orders over $120. Easy 30-day returns on unworn items in original packaging. All pieces are backed by our 2-year warranty.",
                },
              ]}
            />
          </div>
        </div>

        <ProductCarousel title="You may also like" products={related} />
        <Reviews product={product} />
      </main>
      <Footer />
    </>
  );
}
