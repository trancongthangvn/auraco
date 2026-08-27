"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FullProduct } from "@/data/products";
import { collectionFilters } from "@/data/products";

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return <span className="text-xs text-gold">{"★".repeat(full) || "☆"}</span>;
}

export default function CatalogClient({
  products,
  initialCollection = "ALL",
  heading,
  subheading,
}: {
  products: FullProduct[];
  initialCollection?: string;
  heading: string;
  subheading?: string;
}) {
  const searchParams = useSearchParams();
  const brand = searchParams.get("brand")?.replace(/-/g, " ");
  const query = searchParams.get("q")?.toLowerCase().trim();

  const [collection, setCollection] = useState(initialCollection);
  const [sort, setSort] = useState<
    "newest" | "price-asc" | "price-desc" | "featured"
  >("featured");
  const [visible, setVisible] = useState(12);

  const filtered = useMemo(() => {
    let list = brand
      ? products.filter((p) => p.category.toLowerCase() === brand.toLowerCase())
      : products;

    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.material.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    list =
      collection === "ALL"
        ? list
        : list.filter((p) => p.collections.includes(collection));

    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "newest") list.reverse();

    return list;
  }, [products, collection, sort, brand, query]);

  const displayHeading = query
    ? `Search results for "${searchParams.get("q")}"`
    : brand
    ? brand.toUpperCase()
    : heading;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="font-serif-display text-4xl mb-3">{displayHeading}</h1>
        {subheading && !query && (
          <p className="text-sm text-black/60 max-w-xl mx-auto">
            {subheading}
          </p>
        )}
      </div>

      {!query && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-black/10 py-4 mb-10">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs tracking-wide uppercase">
            {collectionFilters.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setCollection(c.value);
                  setVisible(12);
                }}
                className={`pb-1 border-b transition-colors ${
                  collection === c.value
                    ? "border-[#2b261f] text-[#2b261f]"
                    : "border-transparent text-black/50 hover:text-black"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="text-xs uppercase tracking-wide border border-black/20 px-3 py-2 bg-white"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-black/50 py-16">
          No products found{query ? " matching your search." : " in this collection."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.slice(0, visible).map((p) => (
              <Link
                key={p.slug}
                href={`/product/${p.slug}`}
                className="group block"
              >
                <div className="relative aspect-square overflow-hidden bg-[#f5f2ee] mb-3">
                  <Image
                    src={p.images[0]}
                    alt={p.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mb-1">
                  <Stars rating={p.rating} />{" "}
                  <span className="text-xs text-black/50">
                    ({p.reviewCount})
                  </span>
                </p>
                <h3 className="text-[15px] mb-1">{p.name}</h3>
                <p className="text-xs text-black/50 mb-1">{p.material}</p>
                <p className="text-sm">
                  {p.compareAtPrice && (
                    <span className="line-through text-black/40 mr-2">
                      ${p.compareAtPrice.toFixed(2)} USD
                    </span>
                  )}
                  ${p.price.toFixed(2)} USD
                </p>
              </Link>
            ))}
          </div>

          {visible < filtered.length && (
            <div className="text-center mt-12">
              <button
                onClick={() => setVisible((v) => v + 12)}
                className="border border-[#2b261f] px-8 py-3 text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors"
              >
                SHOW MORE
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
