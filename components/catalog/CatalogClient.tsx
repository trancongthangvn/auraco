"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FullProduct } from "@/data/products";
import { collectionFilters as fallbackCollectionFilters } from "@/data/products";
import { StarRating } from "@/components/icons";

export type CollectionFilter = { label: string; value: string };

export default function CatalogClient({
  products,
  initialCollection = "ALL",
  heading,
  subheading,
  collectionFilters = fallbackCollectionFilters,
  brandParam,
  queryParam,
}: {
  products: FullProduct[];
  initialCollection?: string;
  heading: string;
  subheading?: string;
  collectionFilters?: CollectionFilter[];
  /** ?brand= and ?q=, read on the server and passed down. Taking these as
      props instead of calling useSearchParams() keeps this component out of a
      Suspense boundary — an unresolved boundary blanked the whole catalog. */
  brandParam?: string;
  queryParam?: string;
}) {
  const brand = brandParam?.replace(/-/g, " ");
  const query = queryParam?.toLowerCase().trim();

  const [collection, setCollection] = useState(initialCollection);
  const [sort, setSort] = useState<
    "newest" | "price-asc" | "price-desc" | "featured"
  >("featured");
  const [visible, setVisible] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    ? `Search results for "${queryParam ?? ""}"`
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
        <div className="flex items-center justify-between gap-4 border-y border-black/10 py-4 mb-10">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 text-xs tracking-wide uppercase hover:text-gold"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filter
          </button>

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

      {filtersOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-[#2b261f]/40"
          />
          <aside className="relative z-10 flex h-full w-[340px] max-w-[88vw] flex-col bg-white shadow-[8px_0_32px_rgba(43,38,31,0.12)]">
            <header className="flex min-h-[64px] items-center justify-between border-b border-black/10 px-6">
              <h2 className="text-xs font-medium tracking-[0.14em] uppercase">
                Filter
              </h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setFiltersOpen(false)}
                className="text-2xl leading-none text-ink hover:opacity-50"
              >
                ×
              </button>
            </header>
            <div className="flex-1 overflow-y-auto">
              <label className="block border-b border-black/10 px-6 py-4 text-xs uppercase tracking-wide">
                <span className="mb-2 block text-black/50">Collection</span>
                <select
                  value={collection}
                  onChange={(e) => {
                    setCollection(e.target.value);
                    setVisible(12);
                  }}
                  className="w-full border border-black/20 bg-white px-3 py-2 text-xs uppercase tracking-wide"
                >
                  {collectionFilters.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block border-b border-black/10 px-6 py-4 text-xs uppercase tracking-wide">
                <span className="mb-2 block text-black/50">Sort by</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="w-full border border-black/20 bg-white px-3 py-2 text-xs uppercase tracking-wide"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </label>
            </div>
            <div className="border-t border-black/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="w-full border border-[#2b261f] py-3 text-xs uppercase tracking-wide transition-colors hover:bg-[#2b261f] hover:text-white"
              >
                Apply
              </button>
            </div>
          </aside>
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
                {/* Products can be saved with no images; guard the empty src
                    so the card shows the tinted frame, not a broken image. */}
                <div className="relative aspect-square overflow-hidden bg-[#f5f2ee] mb-3">
                  {p.images[0] && (
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="mb-1">
                  <StarRating rating={p.rating} size={12} />{" "}
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
