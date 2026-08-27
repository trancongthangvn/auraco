import { notFound } from "next/navigation";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Gallery from "@/components/product/Gallery";
import AddToBag from "@/components/product/AddToBag";
import Accordion from "@/components/product/Accordion";
import Reviews from "@/components/product/Reviews";
import ProductCarousel from "@/components/ProductCarousel";
import { getProductBySlug, getRelatedProducts, products } from "@/data/products";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return { title: product ? `${product.name} | AURA & CO` : "AURA & CO" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const related = getRelatedProducts(product).map((p) => ({
    name: p.name,
    href: `/product/${p.slug}`,
    material: p.material,
    price: `$${p.price.toFixed(2)} USD`,
    rating: Math.round(p.rating),
    img: p.images[0],
  }));

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
              <p className="text-sm text-gold mb-6">
                {"★".repeat(Math.round(product.rating))}
                {"☆".repeat(5 - Math.round(product.rating))}{" "}
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
                  <span className="text-gold">✦</span>
                  {f}
                </li>
              ))}
            </ul>

            <AddToBag product={product} />

            <Accordion
              items={[
                {
                  title: "Details",
                  content: `Material: ${product.material}\n\nEvery piece is finished by hand and inspected for quality before it ships.`,
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
