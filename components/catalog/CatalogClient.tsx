"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FullProduct } from "@/data/products";
import { collectionFilters as fallbackCollectionFilters } from "@/data/products";
import { StarRating, PlusIcon, MinusIcon } from "@/components/icons";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatPrice } from "@/lib/currency";
import AddToBagButton from "@/components/AddToBagButton";

export type CollectionFilter = { label: string; value: string };

const PRICE_BANDS: { value: string; label: string; test: (n: number) => boolean }[] = [
  { value: "u80", label: "Under $80", test: (n) => n < 80 },
  { value: "80-110", label: "$80 – $110", test: (n) => n >= 80 && n <= 110 },
  { value: "o110", label: "Over $110", test: (n) => n > 110 },
];


/**
 * Category ledes shown under the page title. The reference site renders one
 * generated sentence per brand; ours are written for each category rather
 * than copied, and fall back to the dictionary subheading for search results
 * and the unfiltered catalog.
 */
/**
 * Banner artwork per collection, self-hosted under public/. A collection
 * edited in the admin can override this by setting its own image; this map is
 * only the default for the six seeded collections.
 */
const COLLECTION_BANNER: Record<string, string> = {
  "QUIET-LUXURY": "/images/categories/catalog-banners/7c8a0620-c93b-472f-ba42-02cb7fda1f25.webp",
  MINIMALIST: "/images/categories/catalog-banners/a8be428c-f902-4b28-a793-1c7594133317.webp",
  STATEMENT: "/images/categories/catalog-banners/ba6ac121-600a-4a79-942d-d74ce323183b.webp",
  "TRENDING-NOW": "/images/categories/catalog-banners/b459f2a4-9b70-468a-9a46-b4f80be771ca.webp",
  "BEACH-VIBE": "/images/categories/catalog-banners/e512d811-bdf2-48cd-8158-4351f68545d5.webp",
  "BEST-SELLERS": "/images/categories/catalog-banners/b1b30bf1-bae7-40c4-b7e4-96e1cf5ea483.webp",
};

const COLLECTION_LEDE: Record<string, string> = {
  "QUIET-LUXURY":
    "Understated elegance and timeless silhouettes. Discover pieces designed for effortless, lasting sophistication.",
  MINIMALIST:
    "Effortless, polished, and minimal. Discover the everyday pieces that complete the ultimate clean girl aesthetic.",
  STATEMENT:
    "Channel prosperity and positive energy. Discover symbolic pieces designed to align your vibration with abundance.",
  "TRENDING-NOW":
    "Most-wanted styles, right this second. Discover what the IT girls are wearing today.",
  "BEACH-VIBE":
    "Sun-drenched styles for endless summer days. Discover lightweight pieces designed to catch the coastal light.",
  "BEST-SELLERS":
    "Tried, tested, and adored. Shop the styles our community reaches for on repeat.",
};

const CATEGORY_LEDE: Record<string, string> = {
  necklaces:
    "Timeless designs finished in luminous 18k gold. Handcrafted for effortless layering and everyday luxury.",
  bracelets:
    "Bangles, chains and tennis styles built to stack. Finished by hand in 18k gold vermeil and sterling silver.",
  earrings:
    "Huggies, hoops and drops for every ear stack. Lightweight enough to wear from the commute to the evening.",
  "signature sets":
    "Pieces chosen to be worn together. Matched metals and motifs, ready to gift or keep for yourself.",
};

/** One collapsible facet group inside the inline filter panel — a bold
 *  title row with a +/− toggle, and (only while open) a muted "Clear" link
 *  above the option list. */
function FilterSection({
  title,
  isOpen,
  onToggle,
  onClear,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#ededed] py-5 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[15px] font-semibold text-[#111]">{title}</span>
        {isOpen ? <MinusIcon size={14} /> : <PlusIcon size={14} />}
      </button>
      {isOpen && (
        <div className="mt-3">
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="mb-3 text-[12px] text-[#9a9a9a] underline hover:text-ink"
            >
              Clear
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

export default function CatalogClient({
  products,
  initialCollection = "ALL",
  heading,
  subheading,
  collectionFilters = fallbackCollectionFilters,
  brandParam,
  queryParam,
  heroImage,
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
  /** Collection artwork, shown as a banner with the collection name burned
   *  into its bottom-left corner (the reference site's collection pages). */
  heroImage?: string;
}) {
  const brand = brandParam?.replace(/-/g, " ");
  const query = queryParam?.toLowerCase().trim();

  const { currency } = useCurrency();
  const [collection] = useState(initialCollection);
  const [sort, setSort] = useState<
    "newest" | "price-asc" | "price-desc" | "featured"
  >("featured");
  const [visible, setVisible] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Category and Material open by default, like the reference; Type and
  // Price start collapsed and expand on demand.
  const [openSections, setOpenSections] = useState({
    category: true,
    brand: false,
    material: true,
    price: false,
    sort: false,
  });
  const router = useRouter();

  // The drawer edits a draft and only commits on Apply, like the reference
  // site. Brand lives in the URL (?brand=), so applying it navigates rather
  // than holding a second source of truth for the same value.
  const [draftCollection, setDraftCollection] = useState(initialCollection);
  const [draftBrand, setDraftBrand] = useState(brandParam ?? "");
  const [draftSort, setDraftSort] = useState<
    "newest" | "price-asc" | "price-desc" | "featured"
  >("featured");

  // Facets beyond category/brand stay client-side: they narrow the list the
  // page already has, so a round trip would buy nothing.
  const [materials, setMaterials] = useState<string[]>([]);
  const [priceBand, setPriceBand] = useState("");
  const [draftMaterials, setDraftMaterials] = useState<string[]>([]);
  const [draftPriceBand, setDraftPriceBand] = useState("");

  // The filter panel narrows Type/Material/Price to whatever the currently
  // *drafted* Category (and, in turn, Type) actually has products for — so a
  // combination that would return zero results is never selectable in the
  // first place.
  const toSlug = (label: string) => label.replace(/ /g, "-");
  const collectionScope = useCallback(
    (coll: string) =>
      coll === "ALL" ? products : products.filter((p) => p.collections.includes(coll)),
    [products]
  );
  const brandOptionsFor = (scope: FullProduct[]) =>
    Array.from(new Set(scope.map((p) => p.category)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  const materialOptionsFor = (scope: FullProduct[]) =>
    Array.from(new Set(scope.map((p) => p.material)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

  const draftCollectionScope = useMemo(
    () => collectionScope(draftCollection),
    [collectionScope, draftCollection]
  );
  const draftBrandOptions = useMemo(
    () => brandOptionsFor(draftCollectionScope),
    [draftCollectionScope]
  );
  const draftScope = useMemo(
    () =>
      draftBrand
        ? draftCollectionScope.filter((p) => toSlug(p.category) === draftBrand)
        : draftCollectionScope,
    [draftCollectionScope, draftBrand]
  );
  const draftMaterialOptions = useMemo(
    () => materialOptionsFor(draftScope),
    [draftScope]
  );
  const draftPriceBandOptions = useMemo(
    () => PRICE_BANDS.filter((b) => draftScope.some((p) => b.test(p.price))),
    [draftScope]
  );

  /** Re-narrows Material/Price to the new scope and drops any drafted
   *  selection that scope no longer supports, whenever Category or Type
   *  changes. */
  const pruneToScope = (scope: FullProduct[]) => {
    const materials = materialOptionsFor(scope);
    setDraftMaterials((prev) => prev.filter((m) => materials.includes(m)));
    const bands = PRICE_BANDS.filter((b) => scope.some((p) => b.test(p.price))).map(
      (b) => b.value
    );
    setDraftPriceBand((prev) => (bands.includes(prev) ? prev : ""));
  };

  const onDraftCollectionChange = (value: string) => {
    setDraftCollection(value);
    const scope = collectionScope(value);
    const brands = brandOptionsFor(scope).map(toSlug);
    const nextBrand = draftBrand && brands.includes(draftBrand) ? draftBrand : "";
    setDraftBrand(nextBrand);
    pruneToScope(nextBrand ? scope.filter((p) => toSlug(p.category) === nextBrand) : scope);
  };

  const onDraftBrandChange = (value: string) => {
    setDraftBrand(value);
    const scope = collectionScope(draftCollection);
    pruneToScope(value ? scope.filter((p) => toSlug(p.category) === value) : scope);
  };

  /** Products left after brand, collection and search — the set the material
   *  and price facets describe. Deriving the facets from the whole catalog
   *  instead offered choices that returned nothing on a filtered page. */
  const inScope = useMemo(() => {
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
    return collection === "ALL"
      ? list
      : list.filter((p) => p.collections.includes(collection));
  }, [products, brand, query, collection]);

  // Seeded when the drawer opens rather than in an effect, so the draft never
  // fights the committed values on re-render.
  const openFilters = () => {
    setDraftCollection(collection);
    setDraftBrand(brandParam ?? "");
    setDraftSort(sort);
    setDraftMaterials(materials);
    setDraftPriceBand(priceBand);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setSort(draftSort);
    setMaterials(draftMaterials);
    setPriceBand(draftPriceBand);
    setVisible(12);
    setFiltersOpen(false);

    // Category and brand both live in the URL so the chips, breadcrumb and
    // header highlight all read from one place; only sort stays local.
    const brandChanged = (brandParam ?? "") !== draftBrand;
    const collectionChanged = draftCollection !== collection;
    if (brandChanged || collectionChanged) {
      const base =
        draftCollection === "ALL" ? "/catalog" : `/catalog/${draftCollection}`;
      const qs = draftBrand ? `?brand=${encodeURIComponent(draftBrand)}` : "";
      router.push(`${base}${qs}`);
    }
  };

  const resetFilters = () => {
    setDraftCollection("ALL");
    setDraftBrand("");
    setDraftMaterials([]);
    setDraftPriceBand("");
    setDraftSort("featured");
  };

  const filtered = useMemo(() => {
    let list = inScope;

    if (materials.length > 0) {
      list = list.filter((p) => materials.includes(p.material));
    }

    const band = PRICE_BANDS.find((b) => b.value === priceBand);
    if (band) list = list.filter((p) => band.test(p.price));

    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "newest") list.reverse();

    return list;
  }, [inScope, sort, materials, priceBand]);

  const displayHeading = query
    ? `Search results for "${queryParam ?? ""}"`
    : brand
    ? brand.toUpperCase()
    : heading;

  const activeFilterCount =
    materials.length +
    (priceBand ? 1 : 0) +
    (collection !== "ALL" ? 1 : 0) +
    (brandParam ? 1 : 0);

  const lede =
    collection !== "ALL"
      ? COLLECTION_LEDE[collection]
      : brand
      ? CATEGORY_LEDE[brand.toLowerCase()] ?? subheading
      : subheading;

  // Only collection pages carry artwork; brand pages and search results show
  // the head and toolbar alone.
  const bannerImage = COLLECTION_BANNER[collection] ?? heroImage;
  const showHero = Boolean(bannerImage) && collection !== "ALL" && !query;

  return (
    <div className="px-4 pt-4 pb-14">
      {/* Reference order for a category page: breadcrumb, title, collection
          chips, toolbar, then the banner. The toolbar sits above the artwork,
          not under it. */}
      <nav
        aria-label="Breadcrumb"
        className="mb-[13.6px] flex h-5 items-center text-[13.12px] leading-5 text-[#5c554a]"
      >
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span className="mx-2 text-black/30">/</span>
        <span className="text-ink">
          {query
            ? "Search"
            : collection !== "ALL"
            ? collectionFilters.find((c) => c.value === collection)?.label ??
              collection
            : brand
            ? brand
            : "Catalog"}
        </span>
      </nav>

      <header>
        <h1 className="font-serif-display text-[26.4px] font-normal uppercase leading-[38.28px] text-[#403b35]">
          {displayHeading}
        </h1>
      </header>

      {!query && collectionFilters.length > 0 && (
        /* Each chip is a link to that collection's own page, the way the
           reference site works. Filtering client-side on top of ?brand=
           instead produced empty result sets (e.g. Necklaces ∩ Quiet
           Luxury), which read as the page breaking. */
        <nav aria-label="Collections" className="mb-2 mt-[13px]">
          <div className="flex flex-wrap gap-2">
            {collectionFilters.map((c) => {
              const active = collection === c.value;
              return (
                <Link
                  key={c.value}
                  href={c.value === "ALL" ? "/catalog" : `/catalog/${c.value}`}
                  aria-current={active ? "page" : undefined}
                  className={`font-ui inline-flex items-center rounded-full border-[0.667px] px-[14.4px] py-[7.2px] text-[13.12px] font-normal leading-[16.4px] tracking-[0.26px] transition-colors ${
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-[#2b261f]/[0.18] bg-white text-[#2b261f] hover:border-ink"
                  }`}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {!query && !showHero && lede && (
        <p className="mb-2 max-w-3xl text-[15px] text-black/60">{lede}</p>
      )}

      {!query && (
        /* Sits above the banner, as on the reference: a hairline rule with
           the filter trigger on one side and sort on the other, and no
           product count between them. */
        <div className="sticky top-16 z-30 mb-1 flex items-center justify-between gap-4 border-[0.667px] border-[#2b261f]/[0.14] bg-white/[0.96] px-[13.6px] py-[10.4px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={filtersOpen ? () => setFiltersOpen(false) : openFilters}
              className="font-ui flex items-center gap-[7.2px] rounded-lg border-[0.667px] border-[#2b261f]/[0.14] bg-white px-3 py-2 text-[12.48px] font-semibold uppercase leading-[19.344px] tracking-[1.4976px] hover:text-gold"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              {filtersOpen ? "Hide Filters" : "Filter"}
              {!filtersOpen && activeFilterCount > 0 && (
                <span className="flex h-[18.4px] w-[18.4px] items-center justify-center rounded-full bg-ink text-[10.4px] font-normal leading-none tracking-normal text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {filtersOpen && (
              <span className="font-ui text-[12.48px] text-[#5c554a]">
                {filtered.length} items
              </span>
            )}
          </div>

          {/* The reference pads the control's wrapper as well as the select
              itself, which is what makes the 53px-tall cell around a 37px
              control. */}
          <label className="block px-3 py-2">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="font-ui w-[156px] rounded-lg border-[0.667px] border-[#2b261f]/[0.14] bg-white px-3 py-2 text-[12.48px] font-semibold leading-[19.344px] text-[#2b261f]"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>
      )}

      {/* Inline, collapsible filter panel — opens/closes with the "Filter" /
          "Hide Filters" toggle above; each facet inside is its own
          open/close accordion section (+ / − icon), matching the reference's
          own filter layout rather than a full-screen slide-in drawer. */}
      {!query && filtersOpen && (
        <div className="mb-4 border-[0.667px] border-t-0 border-[#2b261f]/[0.14] bg-white px-[13.6px]">
          <FilterSection
            title="Category"
            isOpen={openSections.category}
            onToggle={() =>
              setOpenSections((s) => ({ ...s, category: !s.category }))
            }
            onClear={
              draftCollection !== "ALL"
                ? () => setDraftCollection("ALL")
                : undefined
            }
          >
            <div className="space-y-3">
              {collectionFilters.map((c) => (
                <label
                  key={c.value}
                  className="flex items-center gap-2.5 text-[14px] text-[#2b261f]"
                >
                  <input
                    type="checkbox"
                    checked={draftCollection === c.value}
                    onChange={() => onDraftCollectionChange(c.value)}
                    className="h-4 w-4 accent-ink"
                  />
                  <span>{c.value === "ALL" ? "All categories" : c.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection
            title="Type"
            isOpen={openSections.brand}
            onToggle={() => setOpenSections((s) => ({ ...s, brand: !s.brand }))}
            onClear={draftBrand ? () => setDraftBrand("") : undefined}
          >
            <div className="space-y-3">
              {draftBrandOptions.map((b) => (
                <label
                  key={b}
                  className="flex items-center gap-2.5 text-[14px] text-[#2b261f]"
                >
                  <input
                    type="checkbox"
                    checked={draftBrand === toSlug(b)}
                    onChange={() => onDraftBrandChange(toSlug(b))}
                    className="h-4 w-4 accent-ink"
                  />
                  <span>{b}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection
            title="Material"
            isOpen={openSections.material}
            onToggle={() =>
              setOpenSections((s) => ({ ...s, material: !s.material }))
            }
            onClear={
              draftMaterials.length > 0 ? () => setDraftMaterials([]) : undefined
            }
          >
            <div className="space-y-3">
              {draftMaterialOptions.map((m) => (
                <label
                  key={m}
                  className="flex items-start gap-2.5 text-[14px] text-[#2b261f]"
                >
                  <input
                    type="checkbox"
                    checked={draftMaterials.includes(m)}
                    onChange={(e) =>
                      setDraftMaterials((prev) =>
                        e.target.checked
                          ? [...prev, m]
                          : prev.filter((x) => x !== m)
                      )
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
                  />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection
            title="Price"
            isOpen={openSections.price}
            onToggle={() => setOpenSections((s) => ({ ...s, price: !s.price }))}
            onClear={draftPriceBand ? () => setDraftPriceBand("") : undefined}
          >
            <div className="space-y-3">
              {draftPriceBandOptions.map((b) => (
                <label
                  key={b.value}
                  className="flex items-center gap-2.5 text-[14px] text-[#2b261f]"
                >
                  <input
                    type="checkbox"
                    checked={draftPriceBand === b.value}
                    onChange={() => setDraftPriceBand(b.value)}
                    className="h-4 w-4 accent-ink"
                  />
                  <span>{b.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection
            title="Sort by"
            isOpen={openSections.sort}
            onToggle={() => setOpenSections((s) => ({ ...s, sort: !s.sort }))}
            onClear={draftSort !== "featured" ? () => setDraftSort("featured") : undefined}
          >
            <div className="space-y-3">
              {(
                [
                  { value: "featured", label: "Featured" },
                  { value: "newest", label: "Newest" },
                  { value: "price-asc", label: "Price: low to high" },
                  { value: "price-desc", label: "Price: high to low" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 text-[14px] text-[#2b261f]"
                >
                  <input
                    type="checkbox"
                    checked={draftSort === opt.value}
                    onChange={() => setDraftSort(opt.value)}
                    className="h-4 w-4 accent-ink"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          <div className="flex items-center gap-[22px] py-6">
            <button
              type="button"
              onClick={applyFilters}
              className="flex h-10 flex-1 max-w-[220px] items-center justify-center bg-[#111] text-[10px] font-medium tracking-[0.08em] text-white uppercase transition-opacity hover:opacity-85"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="text-[12px] text-[#888] hover:text-ink"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {showHero && (
        /* Square corners and a Cormorant lede — the reference sets the
           collection blurb in the display face, not the UI one. */
        <div className="my-[18.4px] pb-[24.17px] pt-[5px]">
          <div className="group/banner relative aspect-[1209/800] w-full overflow-hidden">
            <Image
              src={bannerImage as string}
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover transition-transform duration-700 ease-out group-hover/banner:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(20,17,13,0.68)]" />
            <div className="absolute bottom-6 left-8 max-w-[672px]">
              <p className="font-serif-display text-3xl uppercase text-white sm:text-[45px] sm:leading-[65.25px]">
                {displayHeading}
              </p>
              {lede && (
                <p className="font-serif-display text-base font-normal text-white sm:text-[20px] sm:leading-[29px]">
                  {lede}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!query && activeFilterCount > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {materials.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMaterials((prev) => prev.filter((x) => x !== m))}
              className="inline-flex items-center gap-2 rounded-full border border-black/20 px-3 py-1.5 text-xs hover:border-ink"
            >
              {m}
              <span aria-hidden="true">×</span>
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          {priceBand && (
            <button
              type="button"
              onClick={() => setPriceBand("")}
              className="inline-flex items-center gap-2 rounded-full border border-black/20 px-3 py-1.5 text-xs hover:border-ink"
            >
              {PRICE_BANDS.find((b) => b.value === priceBand)?.label}
              <span aria-hidden="true">×</span>
              <span className="sr-only">Remove filter</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMaterials([]);
              setPriceBand("");
            }}
            className="text-xs text-black/55 underline hover:text-ink"
          >
            Clear all
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-black/50 py-16">
          No products found{query ? " matching your search." : " in this collection."}
        </p>
      ) : (
        <>
          <div className={`${showHero ? "" : "mt-6 "}grid grid-cols-2 gap-[0.65rem] sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4 lg:gap-x-[18.4px] lg:gap-y-8`}>
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
                      className={`object-cover transition-opacity duration-500 ${
                        p.images[1] ? "group-hover:opacity-0" : "transition-transform group-hover:scale-105"
                      }`}
                    />
                  )}
                  {/* Second image is the on-model shot; it fades in on hover,
                      the same front/back swap the reference site uses. */}
                  {p.images[1] && (
                    <Image
                      src={p.images[1]}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    />
                  )}
                  <AddToBagButton productName={p.name} />
                </div>
                <p className="mb-1 flex items-center"><StarRating rating={p.rating} size={16} /></p>
                {/* Two lines are reserved for the name: a one-line name would
                    otherwise pull its material and price up out of line with
                    the cards beside it. */}
                <h3 className="font-serif-display mb-1 line-clamp-2 min-h-[30px] text-[20px] font-normal leading-[23px] text-[#28241f]">
                  {p.name}
                </h3>
                <p className="font-ui mb-1 text-[12px] font-normal leading-[16.8px] tracking-[0.12px] text-[#5f5a54]">
                  {p.material}
                </p>
                <p className="font-ui text-[12px] font-light tracking-[0.12px] text-[#5f5a54]">
                  {p.compareAtPrice && (
                    <span className="line-through text-black/40 mr-2">
                      {formatPrice(p.compareAtPrice, currency)}
                    </span>
                  )}
                  {formatPrice(p.price, currency)}
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
