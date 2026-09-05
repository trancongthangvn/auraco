"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

const SORT_OPTIONS: { value: "featured" | "newest" | "price-asc" | "price-desc"; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
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
  count = 0,
  isOpen,
  onToggle,
  onClear,
  children,
}: {
  title: string;
  /** Active selections in this group — shown as a small pill next to the
   *  title, matching the reference's "Metal (1)" badge. */
  count?: number;
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
        className="group flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-[#111] transition-colors group-hover:text-gold">{title}</span>
          {count > 0 && (
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ink text-[10.4px] font-normal leading-none text-white">
              {count}
            </span>
          )}
        </span>
        <span className="transition-colors group-hover:text-gold">
          {isOpen ? <MinusIcon size={14} /> : <PlusIcon size={14} />}
        </span>
      </button>
      {/* Was `{isOpen && <div>...}` — mounting/unmounting the content
          outright, with no height to animate between, so expanding or
          collapsing a section snapped the whole page open or shut instantly
          and shoved everything below it — explicit report: "runs/jumps
          around when pressing expand/collapse, very annoying". The
          grid-template-rows 0fr↔1fr trick animates a height that was never
          knowable up front (the option list's real height depends on its
          content) without measuring anything in JS: the row track itself
          tweens between collapsed and content-sized, and the inner
          `overflow-hidden` clips whatever hasn't "arrived" yet mid-transition. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
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
      </div>
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
  collectionDescription,
  brandDescription,
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
  /** Admin-set lede for this collection (collections.description). Falls
   *  back to COLLECTION_LEDE when the admin hasn't written one yet. */
  collectionDescription?: string;
  /** Admin-set lede for this brand/category (brands.description). Falls
   *  back to CATEGORY_LEDE when the admin hasn't written one yet. */
  brandDescription?: string;
}) {
  const brand = brandParam?.replace(/-/g, " ");
  const query = queryParam?.toLowerCase().trim();

  const { currency, rates } = useCurrency();
  const [collection] = useState(initialCollection);
  // Explicit request: the sidebar "Category" checkboxes previously called
  // selectCategory(), which navigated to /catalog/<collection> — a full
  // route change. That's why picking one auto-collapsed the panel (the page
  // remounted with openSections back at its closed default) and jumped the
  // scroll position back to the top on every click, and why only one could
  // ever be checked at a time. This is a separate, independent filter, kept
  // client-side exactly like Material/Price below: it starts seeded from
  // whichever single collection the URL landed on (so the checkbox still
  // reflects where you are), but from then on toggles freely and narrows
  // the current product list in place — same pattern as Material, so
  // nothing about the collection route, hero banner, heading or the pill
  // row above the grid (all still driven by `collection` alone) changes.
  const [categoryFilter, setCategoryFilter] = useState<string[]>(
    initialCollection !== "ALL" ? [initialCollection] : []
  );
  const [sort, setSort] = useState<
    "newest" | "price-asc" | "price-desc" | "featured"
  >("featured");
  const [visible, setVisible] = useState(12);

  // Explicit request: a plain native <select>'s OPEN dropdown popup is
  // drawn entirely by the OS/browser, not this site's CSS — the exact same
  // element rendered as a clean light list with a blue highlight on one
  // device and a dark, rounded, checkmarked list on another (macOS/Safari
  // in dark mode; `color-scheme: light` didn't fully override it there — a
  // known WebKit inconsistency for native form-control popups). A custom-
  // built dropdown (same pattern as CurrencyPicker.tsx) is the only way to
  // guarantee the identical look "áp dụng cho tất cả các trang" actually
  // asked for, on every browser and OS, since it's rendered by this
  // component instead of the platform.
  const [sortOpen, setSortOpen] = useState(false);
  const sortRootRef = useRef<HTMLDivElement>(null);
  const sortCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!sortOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (sortRootRef.current && !sortRootRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [sortOpen]);

  // Explicit request: the mobile inline filter panel (Category/Type/.../
  // Reset, below `lg`) used to just sit in normal flow right under the
  // sticky toolbar — scrolling the page carried it away like any other
  // content, so "Category"/"Type" disappeared behind the still-pinned
  // toolbar instead of staying put alongside it. Making the panel sticky
  // too needs its own `top` to sit exactly below the toolbar, which needs
  // the toolbar's real rendered height (not a guess — its content wraps
  // to a second line at some widths). Measured with a ResizeObserver
  // rather than published as a CSS var like Header/Announcement's own
  // heights, since this offset is only ever consumed here in the same
  // component, not by anything elsewhere on the page.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const update = () => setToolbarHeight(el.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // Explicit request: filters open by default on landing (not just once the
  // customer clicks "Show Filters" themselves) — but only on tablet/desktop.
  // On mobile they default closed instead, since the panel there renders
  // inline above the product grid (see filterPanelBody's `lg:hidden` usage
  // below) and pushes every product down a full screen's worth on load.
  // useState(true) keeps server and first-client-render markup identical
  // (avoiding a hydration mismatch); useLayoutEffect corrects it to closed
  // on a narrow viewport before the browser paints, so mobile never
  // visibly flashes open before snapping shut.
  const [filtersOpen, setFiltersOpen] = useState(true);
  useLayoutEffect(() => {
    // One-time correction of the initial default before paint, not a
    // continuous sync with window size (that would fight a user who
    // deliberately opens/closes filters and then resizes the window by a
    // few px) — the narrower pattern the lint rule expects doesn't apply.
    // matchMedia, not window.innerWidth: innerWidth can transiently read 0
    // before layout has settled (confirmed live), and since this effect
    // only runs once on mount, a stray 0 there would lock filters closed
    // permanently even on desktop. matchMedia evaluates the same md:
    // breakpoint Tailwind uses without depending on layout having run yet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!window.matchMedia("(min-width: 768px)").matches) setFiltersOpen(false);
  }, []);
  // Every facet group starts collapsed — the reference's own filter drawer
  // shows compact "+" headers and expands a section only when it's tapped.
  const closedSections = {
    category: false,
    brand: false,
    material: false,
    price: false,
    sort: false,
  };
  const [openSections, setOpenSections] = useState(closedSections);
  const router = useRouter();

  // Facets beyond category/brand stay client-side: they narrow the list the
  // page already has, so a round trip would buy nothing. Category (above)
  // and Material/Price (below) apply the instant a checkbox is ticked, no
  // separate draft/Apply step. Type still navigates via selectBrand,
  // unchanged — out of scope for this request.
  const [materials, setMaterials] = useState<string[]>([]);
  const [priceBand, setPriceBand] = useState("");

  const toSlug = (label: string) => label.replace(/ /g, "-");
  const collectionScope = useCallback(
    (coll: string) =>
      coll === "ALL" ? products : products.filter((p) => p.collections.includes(coll)),
    [products]
  );
  const categoryScope = useCallback(
    (cats: string[]) =>
      cats.length === 0
        ? products
        : products.filter((p) => p.collections.some((c) => cats.includes(c))),
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

  /** Drops any selected Material/Price option the given scope no longer
   *  supports — so a combination that would return zero results is never
   *  left checked after Category or Type changes. */
  const pruneFacetsToScope = (scope: FullProduct[]) => {
    const scopeMaterials = materialOptionsFor(scope);
    setMaterials((prev) => prev.filter((m) => scopeMaterials.includes(m)));
    const bands = PRICE_BANDS.filter((b) => scope.some((p) => b.test(p.price))).map(
      (b) => b.value
    );
    setPriceBand((prev) => (bands.includes(prev) ? prev : ""));
  };

  const applyCategoryFilter = (next: string[]) => {
    setCategoryFilter(next);
    const scope = categoryScope(next);
    const brands = brandOptionsFor(scope).map(toSlug);
    const nextBrand = brandParam && brands.includes(brandParam) ? brandParam : "";
    pruneFacetsToScope(nextBrand ? scope.filter((p) => toSlug(p.category) === nextBrand) : scope);
    setVisible(12);
  };

  const toggleCategoryFilter = (value: string) => {
    applyCategoryFilter(
      categoryFilter.includes(value)
        ? categoryFilter.filter((v) => v !== value)
        : [...categoryFilter, value]
    );
  };

  const selectBrand = (value: string) => {
    const scope = collectionScope(collection);
    pruneFacetsToScope(value ? scope.filter((p) => toSlug(p.category) === value) : scope);
    setVisible(12);
    const base = collection === "ALL" ? "/catalog" : `/catalog/${collection}`;
    const qs = value ? `?brand=${encodeURIComponent(value)}` : "";
    router.push(`${base}${qs}`);
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
    return categoryFilter.length === 0
      ? list
      : list.filter((p) => p.collections.some((c) => categoryFilter.includes(c)));
  }, [products, brand, query, categoryFilter]);

  // Type/Material/Price options are derived from whatever Category (and, in
  // turn, Type) is currently committed — never from a draft — so an option
  // that would return zero results is never offered.
  const collectionOnlyScope = useMemo(
    () => categoryScope(categoryFilter),
    [categoryScope, categoryFilter]
  );
  const brandOptions = useMemo(
    () => brandOptionsFor(collectionOnlyScope),
    [collectionOnlyScope]
  );
  const materialOptions = useMemo(() => materialOptionsFor(inScope), [inScope]);
  const priceBandOptions = useMemo(
    () => PRICE_BANDS.filter((b) => inScope.some((p) => b.test(p.price))),
    [inScope]
  );

  // Every group collapses again each time the panel is opened, matching the
  // reference's own compact, all-closed default.
  const openFilters = () => {
    setOpenSections(closedSections);
    setFiltersOpen(true);
  };

  const resetFilters = () => {
    setMaterials([]);
    setPriceBand("");
    setCategoryFilter([]);
    setSort("featured");
    setVisible(12);
    if (collection !== "ALL" || brandParam) {
      router.push("/catalog");
    }
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
    categoryFilter.length +
    (brandParam ? 1 : 0);

  const lede =
    collection !== "ALL"
      ? collectionDescription ?? COLLECTION_LEDE[collection]
      : brand
      ? brandDescription ?? CATEGORY_LEDE[brand.toLowerCase()] ?? subheading
      : subheading;

  // Only collection pages carry artwork; brand pages and search results show
  // the head and toolbar alone. An admin-set image (heroImage, from
  // collections.image_url) takes priority over the seeded default — this was
  // backwards before (the hard-coded map always won), so changing a
  // collection's image in the admin silently had no visible effect.
  const bannerImage = heroImage ?? COLLECTION_BANNER[collection];
  const showHero = Boolean(bannerImage) && collection !== "ALL" && !query;

  // Shared between the mobile/tablet inline toolbar and the desktop sidebar
  // header (persistent left column) so both stay pixel-identical instead of
  // drifting apart as two hand-maintained copies.
  const filterToggleAndCount = (
    <>
      {/* Borderless, plain-case "sliders" icon — explicit request, matching
          the reference exactly: no button border/background, no uppercase
          transform, no heavy weight/tracking (all of that was this button's
          own decoration, not something the reference does). */}
      <button
        type="button"
        onClick={filtersOpen ? () => setFiltersOpen(false) : openFilters}
        className="font-ui flex w-full items-center justify-center gap-[7.2px] px-3 py-2 text-[12.48px] font-normal leading-[19.344px] hover:text-gold sm:w-auto sm:justify-start"
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
          <line x1="4" y1="6" x2="20" y2="6" />
          <circle cx="14" cy="6" r="2" fill="currentColor" stroke="none" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
        </svg>
        {filtersOpen ? "Hide Filters" : "Show Filters"}
      </button>
      {/* Explicit request: the item count sits next to the toggle in both
          states now, not just once the sidebar is open. */}
      <span className="font-ui text-[12.48px] text-[#5c554a]">
        {filtered.length} items
      </span>
    </>
  );

  const sortSelect = (
    // hidden lg:block — explicit request: below `lg` this duplicated the
    // "Sort by" facet already inside filterPanelBody's own accordion list
    // (Category/Type/Material/Price/Sort by/Reset), so a customer had two
    // different sort controls on screen at once on mobile/tablet. The
    // accordion's own copy (checkboxes, same options) already covers that
    // range — this hover-opened dropdown now only renders at `lg`+, next
    // to "Hide/Show Filters" as before.
    <div
      ref={sortRootRef}
      className="relative hidden min-w-0 flex-1 px-3 py-2 sm:flex-none lg:block"
      // Explicit request, confirmed against a reference example: opens on
      // hover, not just click — but only on desktop. mouseenter/mouseleave
      // simply never fire on a touch tap (same reasoning already documented
      // on Header.tsx's own mega-menu triggers), so tapping this on mobile
      // still falls through to the onClick toggle below rather than needing
      // a second tap. The close is debounced (same 150ms pattern as
      // Header's openMegaMenu/scheduleCloseMega) so moving the cursor from
      // the trigger to the list across the small gap between them doesn't
      // close it before it's reached.
      onMouseEnter={() => {
        if (sortCloseTimerRef.current) clearTimeout(sortCloseTimerRef.current);
        setSortOpen(true);
      }}
      onMouseLeave={() => {
        if (sortCloseTimerRef.current) clearTimeout(sortCloseTimerRef.current);
        sortCloseTimerRef.current = setTimeout(() => setSortOpen(false), 150);
      }}
    >
      <button
        type="button"
        onClick={() => setSortOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={sortOpen}
        className="font-ui flex w-full items-center justify-between gap-2 rounded-lg border-[0.667px] border-[#2b261f]/[0.14] bg-white px-3 py-2 text-[12.48px] font-semibold leading-[19.344px] text-[#2b261f] sm:w-[156px]"
      >
        {/* Explicit request: the trigger always reads "Sort", not the
            currently-selected option's own label — matching the reference,
            which never changes its own trigger text either. The selected
            option is instead shown via the filled radio dot in the list
            below. */}
        Sort
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" className="shrink-0">
          <line x1="4" y1="6" x2="20" y2="6" />
          <circle cx="14" cy="6" r="2" fill="currentColor" stroke="none" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {sortOpen && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-40 mt-2 w-[220px] rounded-[14px] bg-white p-[7.2px] shadow-[0_16px_42px_rgba(31,26,20,0.16)] sm:w-[240px]"
        >
          {SORT_OPTIONS.map((opt) => {
            const active = opt.value === sort;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setSort(opt.value);
                    setSortOpen(false);
                  }}
                  className={`flex w-full items-center gap-[11px] rounded-[10px] px-[11.52px] py-[10.88px] text-left font-ui text-[13.44px] hover:bg-black/5 ${
                    active ? "font-semibold text-[#2b261f]" : "text-[#2b261f]"
                  }`}
                >
                  {/* Radio circle, not a checkmark-on-tinted-row — explicit
                      request, matching the reference's own list exactly. */}
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                      active ? "border-gold" : "border-[#2b261f]/25"
                    }`}
                  >
                    {active && <span className="h-[9px] w-[9px] rounded-full bg-gold" />}
                  </span>
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  // The five collapsible facet groups plus Reset — identical content shown
  // either inline above the grid (mobile/tablet) or inside the persistent
  // left sidebar (desktop, once filters are open).
  const filterPanelBody = (
    <>
      <FilterSection
        title="Category"
        count={categoryFilter.length}
        isOpen={openSections.category}
        onToggle={() =>
          setOpenSections((s) => ({ ...s, category: !s.category }))
        }
        onClear={
          categoryFilter.length > 0 ? () => applyCategoryFilter([]) : undefined
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
                checked={
                  c.value === "ALL"
                    ? categoryFilter.length === 0
                    : categoryFilter.includes(c.value)
                }
                onChange={() =>
                  c.value === "ALL"
                    ? applyCategoryFilter([])
                    : toggleCategoryFilter(c.value)
                }
                className="h-4 w-4 accent-ink"
              />
              <span>{c.value === "ALL" ? "All categories" : c.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Type"
        count={brandParam ? 1 : 0}
        isOpen={openSections.brand}
        onToggle={() => setOpenSections((s) => ({ ...s, brand: !s.brand }))}
        onClear={brandParam ? () => selectBrand("") : undefined}
      >
        <div className="space-y-3">
          {brandOptions.map((b) => (
            <label
              key={b}
              className="flex items-center gap-2.5 text-[14px] text-[#2b261f]"
            >
              <input
                type="checkbox"
                checked={(brandParam ?? "") === toSlug(b)}
                onChange={() => selectBrand(toSlug(b))}
                className="h-4 w-4 accent-ink"
              />
              <span>{b}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Material"
        count={materials.length}
        isOpen={openSections.material}
        onToggle={() =>
          setOpenSections((s) => ({ ...s, material: !s.material }))
        }
        onClear={
          materials.length > 0 ? () => setMaterials([]) : undefined
        }
      >
        <div className="space-y-3">
          {materialOptions.map((m) => (
            <label
              key={m}
              className="flex items-start gap-2.5 text-[14px] text-[#2b261f]"
            >
              <input
                type="checkbox"
                checked={materials.includes(m)}
                onChange={(e) => {
                  setMaterials((prev) =>
                    e.target.checked
                      ? [...prev, m]
                      : prev.filter((x) => x !== m)
                  );
                  setVisible(12);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
              />
              <span>{m}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Price"
        count={priceBand ? 1 : 0}
        isOpen={openSections.price}
        onToggle={() => setOpenSections((s) => ({ ...s, price: !s.price }))}
        onClear={priceBand ? () => setPriceBand("") : undefined}
      >
        <div className="space-y-3">
          {priceBandOptions.map((b) => (
            <label
              key={b.value}
              className="flex items-center gap-2.5 text-[14px] text-[#2b261f]"
            >
              <input
                type="checkbox"
                checked={priceBand === b.value}
                onChange={() => {
                  setPriceBand(b.value);
                  setVisible(12);
                }}
                className="h-4 w-4 accent-ink"
              />
              <span>{b.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* lg:hidden — explicit report: filterPanelBody is shared verbatim
          between the mobile inline panel AND the desktop sidebar (both
          just render `{filterPanelBody}`), so this accordion copy of Sort
          was showing at `lg`+ too, right alongside the toolbar's own
          separate hover-opened "Sort" dropdown — the exact duplication
          being fixed for mobile also existed on desktop the whole time.
          Desktop keeps only the toolbar dropdown; below `lg`, where that
          dropdown is now hidden (see sortSelect above), this is the only
          way to change sort. */}
      <div className="lg:hidden">
        <FilterSection
          title="Sort by"
          isOpen={openSections.sort}
          onToggle={() => setOpenSections((s) => ({ ...s, sort: !s.sort }))}
          onClear={sort !== "featured" ? () => setSort("featured") : undefined}
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
                  checked={sort === opt.value}
                  onChange={() => setSort(opt.value)}
                  className="h-4 w-4 accent-ink"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      </div>

      <div className="flex items-center py-6">
        <button
          type="button"
          onClick={resetFilters}
          className="text-[12px] text-[#888] hover:text-ink"
        >
          Reset
        </button>
      </div>
    </>
  );

  return (
    <div className="px-4 pt-4 pb-14">
      {/* Reference order for a category page: breadcrumb, title, collection
          chips, toolbar, then the banner. The toolbar sits above the artwork,
          not under it. */}
      <nav
        aria-label="Breadcrumb"
        className="mb-0 flex h-5 items-center text-[13.12px] leading-5 text-[#5c554a]"
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

      {/* The lede sits between the title and the collection chips on every
          category page — it was rendering after the chips here, which only
          matched the reference by coincidence on pages where the chips
          block was absent. */}
      {!query && !showHero && lede && (
        <p className="mb-2 max-w-3xl text-[15px] text-black/60">{lede}</p>
      )}

      {!query && collectionFilters.length > 0 && (
        /* Each chip is a link to that collection's own page, the way the
           reference site works. Filtering client-side on top of ?brand=
           instead produced empty result sets (e.g. Necklaces ∩ Quiet
           Luxury), which read as the page breaking. */
        <nav aria-label="Collections" className="mb-2 mt-[13px]">
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {collectionFilters.map((c) => {
              const active = collection === c.value;
              return (
                <Link
                  key={c.value}
                  href={c.value === "ALL" ? "/catalog" : `/catalog/${c.value}`}
                  aria-current={active ? "page" : undefined}
                  className={`font-ui inline-flex shrink-0 items-center rounded-full border-[0.667px] px-[14.4px] py-[7.2px] text-[13.12px] font-normal leading-[16.4px] tracking-[0.26px] transition-colors ${
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

      {/* Below `lg`, filters (when open) stay an inline full-width panel above
          the grid — the original behavior. At `lg` and up, once filters are
          open this becomes a persistent two-column layout: a ~264px left
          sidebar (toggle + count + facets + Reset) alongside the grid, which
          keeps its own width in the right column. Closed, or below `lg`,
          there's a single column exactly as before.
          Explicit request: opening/closing now slides and pushes smoothly
          instead of snapping instantly. That needs the column track itself
          to transition (0px ↔ 264px, not the `lg:grid`/`lg:grid-cols-*`
          utilities being added and removed outright, which is a discrete
          class swap with nothing to animate between) and the sidebar to
          stay mounted throughout, animating its own width/opacity rather
          than being conditionally rendered in and out. */}
      {!query && (
        /* The one and only toggle+count+sort row, now OUTSIDE the two-column
           grid below — explicit report, confirmed against two reference
           screenshots (filters open vs. closed): this row sits at the exact
           same x position in both, because on the reference it isn't part of
           the sliding grid at all. It used to live inside the product
           column (`min-w-0` div below), so even once it stopped duplicating
           itself it still slid sideways by the sidebar's own width as
           grid-template-columns animated between them. Living above the
           grid entirely means neither column's width changes it. */
        /* top-16 (a fixed 64px) matched the header back when the header was
           simply `sticky top-0` at a stable height. Since Header started
           publishing its own real height as --header-h and stacking below
           a separately-sticky Announcement bar (--announcement-h, 0 or
           ~40px depending on whether the customer has dismissed it), that
           fixed 64px fell short whenever the announcement bar was still
           showing — this row would try to stick 64px down, which sits
           UNDER the now-taller header, so the opaque header visually
           covered it while scrolling ("thanh Filter mất khi lướt xuống",
           explicit bug report). Composing both published heights instead
           keeps this flush under the header regardless of which state
           it's in.
           bg-white (was bg-white/[0.96]): explicit bug report — while
           scrolling with the mobile inline filter panel open, this bar's
           4% transparency let the "Category" section heading directly
           underneath it bleed through as a ghosted double-exposure right
           where the two overlap in the viewport. A fully opaque background
           still covers whatever scrolls behind it (expected for any sticky
           bar), it just does so cleanly instead of looking broken. */
        <div
          ref={toolbarRef}
          className="sticky top-[calc(var(--announcement-h,0px)+var(--header-h,64px))] z-30 mb-1 flex items-center justify-between gap-4 bg-white py-[10.4px]"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
            {filterToggleAndCount}
          </div>

          {/* The reference pads the control's wrapper as well as the select
              itself, which is what makes the 53px-tall cell around a 37px
              control. */}
          {sortSelect}
        </div>
      )}

      <div
        className={`lg:items-start lg:gap-10 lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out ${
          !query ? (filtersOpen ? "lg:grid lg:grid-cols-[264px_1fr]" : "lg:grid lg:grid-cols-[0px_1fr]") : ""
        }`}
      >
        {!query && (
          <aside
            // lg:min-w-0 overrides a grid item's default min-width:auto,
            // which would otherwise force the track back open to fit this
            // content even while grid-template-columns says 0px — the track
            // and the item need to shrink together for the collapse to
            // actually read as a slide rather than a jump-cut at the end.
            //
            // top/maxHeight are inline (not lg:top-20/lg:max-h-[calc(100vh-
            // 6rem)]) — explicit bug report: that fixed 80px only matched
            // Header's own ~65px height plus a 15px gap when Announcement
            // was dismissed. With it showing, Header's real footprint grows
            // to ~105px (Announcement's own height + Header's), so the
            // sidebar started 25px too high — its own top edge, and the
            // "Category" heading inside it, sat behind the opaque header.
            // Composing both published heights (same pattern as the
            // toolbar and mobile panel above) keeps this flush below
            // Header regardless of which state it's in. Only ever applied
            // at `lg`+ in practice — hidden below that — so no lg: prefix
            // is needed on the inline style itself.
            className={`hidden lg:sticky lg:block lg:min-w-0 lg:self-start lg:overflow-y-auto lg:overflow-x-hidden lg:transition-opacity lg:duration-300 lg:ease-out ${
              filtersOpen ? "lg:opacity-100" : "lg:pointer-events-none lg:opacity-0"
            }`}
            style={{
              top: "calc(var(--announcement-h,0px) + var(--header-h,64px) + 16px)",
              maxHeight: "calc(100vh - var(--announcement-h,0px) - var(--header-h,64px) - 32px)",
            }}
          >
            {/* No toggle/count copy here — it used to live in this sidebar
                AND in the toolbar row below simultaneously, discretely
                swapping which one was visible as filtersOpen changed. That
                read as the control jumping between two different spots on
                the page, especially now that opening/closing animates —
                explicit report. There's exactly one now, fixed in the
                toolbar row (see below), which never moves; only this facet
                panel slides in and out beside it. No card border/background
                around the facet list either — explicit request, confirmed
                live against the reference. */}
            <div>{filterPanelBody}</div>
          </aside>
        )}

        <div className="min-w-0">

          {/* Inline, collapsible filter panel — opens/closes with the "Filter" /
              "Hide Filters" toggle above; each facet inside is its own
              open/close accordion section (+ / − icon), matching the reference's
              own filter layout rather than a full-screen slide-in drawer. Only
              below `lg`: at `lg`+ the sidebar above takes over.
              Explicit request: sticky like the toolbar above it, sitting
              exactly at its bottom edge (top adds the measured toolbarHeight
              on top of Announcement/Header's own published heights) — the
              panel used to just scroll away with the page, so "Category"/
              "Type" disappeared behind the toolbar instead of staying
              visible together with it. max-height + its own scroll is the
              same safety net the desktop sidebar already uses, in case the
              panel (with an accordion section open) is ever taller than
              the viewport space left below the toolbar. */}
          {!query && filtersOpen && (
            <div
              className="sticky mb-4 overflow-y-auto border-[0.667px] border-t-0 border-[#2b261f]/[0.14] bg-white px-[13.6px] lg:hidden"
              style={{
                top: `calc(var(--announcement-h,0px) + var(--header-h,64px) + ${toolbarHeight ?? 75}px)`,
                maxHeight: `calc(100vh - var(--announcement-h,0px) - var(--header-h,64px) - ${toolbarHeight ?? 75}px)`,
              }}
            >
              {filterPanelBody}
            </div>
          )}

          {showHero && (
        /* Square corners and a Cormorant lede — the reference sets the
           collection blurb in the display face, not the UI one. */
        <div className="my-[18.4px] pb-[24.17px] pt-[5px]">
          {/* Below 768px the reference's own mobile stylesheet swaps this from
              the landscape aspect-[1209/800] ratio to a fixed 450px height —
              not aspect-ratio-based at all at that breakpoint — which reads
              as a tall/portrait banner instead of the wide one desktop gets. */}
          <div className="group/banner relative h-[450px] w-full overflow-hidden md:h-auto md:aspect-[1209/800]">
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
        // mb-[5px]: explicit request — this row had no bottom margin at all
        // (the product grid below has its own mt-6 only when `!showHero`,
        // so on a collection page like this one the two sat directly
        // adjacent with zero gap), which read as the chips touching/
        // pressing into the product images' top edge.
        <div className="mt-6 mb-[5px] flex flex-wrap items-center gap-2">
          {categoryFilter.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => applyCategoryFilter(categoryFilter.filter((v) => v !== c))}
              className="inline-flex items-center gap-2 rounded-full border border-black/20 px-3 py-1.5 text-xs hover:border-ink"
            >
              {collectionFilters.find((f) => f.value === c)?.label ?? c}
              <span aria-hidden="true">×</span>
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          {brandParam && (
            <button
              type="button"
              onClick={() => selectBrand("")}
              className="inline-flex items-center gap-2 rounded-full border border-black/20 px-3 py-1.5 text-xs hover:border-ink"
            >
              {brand}
              <span aria-hidden="true">×</span>
              <span className="sr-only">Remove filter</span>
            </button>
          )}
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
          {/* Explicit request: matches the pill/border style of every
              removable chip beside it (was a plain underlined text link,
              visually inconsistent with its own row) — same classes minus
              the "×" remove icon, since this clears everything at once
              rather than one filter. */}
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-full border border-black/20 px-3 py-1.5 text-xs hover:border-ink"
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
                  {/* Same badge treatment as the homepage carousel
                      (ProductCarousel.tsx) — this catalog grid never
                      rendered `badgeLabel` at all despite the admin having a
                      field for it and the data already flowing through. */}
                  {p.badgeLabel && (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-[#111] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.04em] text-white">
                      {p.badgeLabel}
                    </span>
                  )}
                  {p.images[0] && (
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className={`object-cover transition-opacity duration-[900ms] ${
                        p.images[1] ? "group-hover:opacity-0" : "transition-transform group-hover:scale-105"
                      }`}
                    />
                  )}
                  {/* Second image is the on-model shot; it fades in on hover,
                      the same front/back swap the reference site uses. Slowed
                      from 500ms — a customer said the swap felt jarring at
                      that speed. */}
                  {p.images[1] && (
                    <Image
                      src={p.images[1]}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover opacity-0 transition-opacity duration-[900ms] group-hover:opacity-100"
                    />
                  )}
                  <AddToBagButton
                    item={{
                      slug: p.slug,
                      name: p.name,
                      price: p.price,
                      image: p.images[0] ?? null,
                      material: p.material,
                    }}
                  />
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
                  {formatPrice(p.price, currency, rates[currency])}
                  {p.compareAtPrice && (
                    <span className="line-through text-black/40 ml-2">
                      {formatPrice(p.compareAtPrice, currency, rates[currency])}
                    </span>
                  )}
                </p>
              </Link>
            ))}
          </div>

          {visible < filtered.length && (
            <div className="text-center mt-12">
              <button
                onClick={() => setVisible((v) => v + 12)}
                className="font-ui text-sm uppercase tracking-[0.08em] text-[#2b261f] underline underline-offset-4 hover:text-gold transition-colors"
              >
                Show more
              </button>
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
}
