"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { navLinks, ourStoryLinks, collections } from "@/data/site";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import CurrencyPicker from "@/components/currency/CurrencyPicker";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import FlagIcon, { type FlagKind } from "@/components/i18n/FlagIcon";
import { currencies, currencyMeta } from "@/lib/currency";
import { useCart } from "@/components/cart/CartProvider";
import { apiFetch } from "@/lib/api";
import { toFullProduct, type ApiProduct } from "@/lib/catalog-mappers";
import type { FullProduct } from "@/data/products";
import {
  SearchIcon,
  UserIcon,
  BagIcon,
  MenuIcon,
  CloseIcon,
  ChevronDownIcon,
  CheckIcon,
} from "@/components/icons";

// Mirrors CurrencyPicker's own (unexported) map — GBP reuses the UK flag
// FlagIcon already draws for "en", EUR/USD have no locale equivalent.
const CURRENCY_FLAG: Record<(typeof currencies)[number], FlagKind> = {
  USD: "us",
  EUR: "eu",
  GBP: "en",
};

// Top-level nav categories that get a real-product mega-menu on the live
// site (each `<li class="site-nav__item--mega">` there expands into a
// panel of ~product links plus a "View all X" link). Best Sellers is
// deliberately NOT one of these — measured directly off auracojewelry.com,
// that nav item is a plain link with no dropdown; its own product list lives
// inside the Collections accordion instead (see `collections` below).
const megaCategories: Record<string, string> = {
  necklaces: "Necklaces",
  bracelets: "Bracelets",
  earrings: "Earrings",
  signatureSets: "Signature Sets",
};

/** Slug used by `/api/products?collection=<slug>` and `/catalog/<slug>`, derived from the collection's own href (e.g. "/catalog/QUIET-LUXURY" -> "QUIET-LUXURY"). */
const collectionSlug = (href: string) => href.split("/").filter(Boolean).pop() || "";

export default function Header({
  activeNavKey,
}: {
  /** Set by pages that already know which nav item is current (the catalog
   *  knows its ?brand= server-side). Pages that don't pass it fall back to
   *  reading the URL below. */
  activeNavKey?: string | null;
} = {}) {
  const dict = useDictionary();
  const { totalQty } = useCart();
  const { currency, setCurrency } = useCurrency();
  const [mobileCurrencyOpen, setMobileCurrencyOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [mobileOpenMega, setMobileOpenMega] = useState<string | null>(null);
  const [megaProducts, setMegaProducts] = useState<
    Record<string, FullProduct[] | "loading" | "error">
  >({});
  // "Collections" nav item: one product-preview list per collection group
  // (QUIET LUXURY, MINIMALIST, ...), keyed by collection slug rather than
  // nav key since each group loads independently inside its own <details>.
  const [collectionProducts, setCollectionProducts] = useState<
    Record<string, FullProduct[] | "loading" | "error">
  >({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileStoryOpen, setMobileStoryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileCurrencyRef = useRef<HTMLDivElement>(null);

  // Click-outside-to-close for the mobile drawer's currency dropdown —
  // tapping anywhere else in the drawer (or on the backdrop) left it open
  // before, only the trigger itself (toggle) could close it.
  useEffect(() => {
    if (!mobileCurrencyOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (mobileCurrencyRef.current && !mobileCurrencyRef.current.contains(e.target as Node)) {
        setMobileCurrencyOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mobileCurrencyOpen]);

  // Which nav item the customer is currently on, so it can be highlighted.
  // usePathname() alone can't tell the catalog brand filters apart (they all
  // share "/catalog", differing only by ?brand=), and useSearchParams() is
  // banned in this codebase (it broke the whole /catalog tree in production
  // once — see DEPLOYMENT.md). So this reads location.search directly,
  // re-computed on every pathname change and on browser back/forward; the
  // Link onClick handlers below cover the one gap that misses (clicking
  // between two ?brand= links, which doesn't change the pathname).
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    const compute = () => {
      if (pathname === "/catalog/BEST-SELLERS") {
        setActiveKey("bestSellers");
        return;
      }
      if (pathname === "/catalog") {
        const brand = new URLSearchParams(window.location.search).get("brand");
        const brandKey: Record<string, string> = {
          Necklaces: "necklaces",
          Bracelets: "bracelets",
          Earrings: "earrings",
          "Signature-Sets": "signatureSets",
        };
        setActiveKey(brand ? brandKey[brand] ?? null : "collections");
        return;
      }
      const story = ourStoryLinks.find((l) => l.href === pathname);
      setActiveKey(story ? story.key : null);
    };
    compute();
    window.addEventListener("popstate", compute);
    return () => window.removeEventListener("popstate", compute);
  }, [pathname]);

  const currentKey = activeNavKey !== undefined ? activeNavKey : activeKey;

  // `mega` is only passed by the mega-menu trigger links (Necklaces,
  // Bracelets, Earrings, Signature Sets) — on the reference site, hovering
  // one of those underlines the trigger text (color unchanged) and the
  // underline stays while the dropdown panel itself is open, not just on
  // raw CSS :hover. Plain links (Best Sellers, Our Story) and the
  // Collections trigger don't get this, so they omit the second argument.
  const navLinkClass = (key: string, mega?: { isOpen: boolean }) =>
    `whitespace-nowrap transition-colors ${currentKey === key ? "text-gold" : ""} ${
      mega
        ? `hover:underline underline-offset-4 ${mega.isOpen ? "underline" : ""}`
        : "hover:text-gold"
    }`;

  const loadMega = (key: string) => {
    const category = megaCategories[key];
    if (!category || megaProducts[key]) return;
    setMegaProducts((prev) => ({ ...prev, [key]: "loading" }));
    apiFetch<ApiProduct[]>(`/api/products?category=${encodeURIComponent(category)}`)
      .then((rows) => {
        // Explicit request: cap each mega-menu dropdown at 6 products,
        // sorted A-Z, dropping the rest — a deliberate departure from the
        // reference site (which caps at 12, not 6).
        const mapped = rows
          .map(toFullProduct)
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 6);
        setMegaProducts((prev) => ({ ...prev, [key]: mapped }));
      })
      .catch(() => {
        setMegaProducts((prev) => ({ ...prev, [key]: "error" }));
      });
  };

  const loadCollectionProducts = (slug: string) => {
    if (!slug || collectionProducts[slug]) return;
    setCollectionProducts((prev) => ({ ...prev, [slug]: "loading" }));
    apiFetch<ApiProduct[]>(`/api/products?collection=${encodeURIComponent(slug)}`)
      .then((rows) => {
        const mapped = rows.map(toFullProduct).slice(0, 8);
        setCollectionProducts((prev) => ({ ...prev, [slug]: mapped }));
      })
      .catch(() => {
        setCollectionProducts((prev) => ({ ...prev, [slug]: "error" }));
      });
  };

  const openMegaMenu = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMega(key);
    loadMega(key);
  };

  const scheduleCloseMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMega(null), 150);
  };

  const openAccountMenu = () => {
    if (accountCloseTimer.current) clearTimeout(accountCloseTimer.current);
    setAccountMenuOpen(true);
  };

  const scheduleCloseAccountMenu = () => {
    if (accountCloseTimer.current) clearTimeout(accountCloseTimer.current);
    accountCloseTimer.current = setTimeout(() => setAccountMenuOpen(false), 150);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/catalog?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
    setMobileOpen(false);
  };

  return (
    <>
    <header className="sticky top-[var(--announcement-h,0px)] z-40 border-b border-black/5 bg-white/95 backdrop-blur-sm">
      {/* Always a 3-column grid (auto/1fr/auto), not flex+mx-auto: at every
          width there are exactly 3 visible children (hamburger+logo+icons on
          mobile, logo+nav+icons on desktop — the 4th is always display:none
          and drops out of grid flow), so auto-placement centers the logo
          truly regardless of how wide the two side clusters are. mx-auto
          alone couldn't do this once the icon cluster outweighed the
          hamburger button, which visibly off-centered the wordmark. */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-3 sm:px-4 min-[1200px]:min-h-[64px] min-[1200px]:gap-x-[20px]">
        {/* Reference's mobile header groups the hamburger and search icon
            together on the left (measured: hamburger x≈14, search x≈54,
            right next to each other), unlike desktop where search sits in
            the right-hand icon cluster. This wrapper is the grid's first
            column on both breakpoints; on desktop both children are hidden
            (via their own min-[1200px]:hidden below) so the cell collapses
            to 0 width, same as when the hamburger alone lived here.
            1200px, not Tailwind's stock lg (1024) — measured the header's
            own content width (~1135-1165px across desktop nav + icon
            cluster at gap-6/13.2px), which overflowed the container between
            1024 and ~1150px, causing a horizontal scrollbar on the header
            itself. */}
        <div className="min-[1200px]:hidden flex items-center gap-1 shrink-0 -ml-1">
          <button
            aria-label={mobileOpen ? dict.nav.closeMenu : dict.nav.openMenu}
            onClick={() => setMobileOpen((v) => !v)}
            className="p-1 hover:text-gold"
          >
            {mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
          <div className="relative">
            <button
              aria-label={dict.nav.search}
              onClick={() => setSearchOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center hover:text-gold"
            >
              <SearchIcon size={22.4} />
            </button>
            {searchOpen && (
              <div className="absolute top-full left-0 z-50 w-[280px] max-w-[calc(100vw-2rem)] pt-3">
                <form
                  onSubmit={submitSearch}
                  className="flex items-center gap-2 border border-black/10 bg-white p-3 shadow-[0_14px_40px_rgba(32,27,22,0.08)]"
                >
                  <input
                    // Two search inputs are mounted at once (this mobile
                    // copy and the desktop one in the icon cluster below) —
                    // autoFocus on both would race for focus since toggling
                    // display doesn't remount either. Focus only the one
                    // that's actually visible at the current breakpoint.
                    ref={(el) => {
                      if (el && el.offsetParent !== null) el.focus();
                    }}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onBlur={() => !query && setSearchOpen(false)}
                    placeholder={dict.nav.searchPlaceholder}
                    className="min-w-0 flex-1 border-b border-black/30 text-sm px-1 py-1 outline-none"
                  />
                  <button
                    type="submit"
                    aria-label={dict.nav.search}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center hover:text-gold"
                  >
                    <SearchIcon size={18} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <Link
          href="/"
          aria-label="AURA & CO"
          className="shrink-0 mx-auto whitespace-nowrap font-serif-display text-[27px] font-normal leading-[27px] tracking-[-0.015em] text-ink"
        >
          AURA & CO
        </Link>

        <nav className="font-ui hidden min-[1200px]:flex items-center justify-center gap-6 text-[13.2px] font-normal uppercase tracking-[0.055em] leading-[1.2] text-[#2b261f] min-[1200px]:translate-y-[1.5px]">
          {navLinks.map((link) => {
            if (link.key === "collections") {
              return (
                <div
                  key={link.key}
                  className="relative"
                  onMouseEnter={() => openMegaMenu(link.key)}
                  onMouseLeave={scheduleCloseMega}
                >
                  <Link
                    href={link.href}
                    className={navLinkClass(link.key)}
                    onFocus={() => openMegaMenu(link.key)}
                    onClick={() => setActiveKey(link.key)}
                  >
                    {dict.nav[link.key]}
                  </Link>
                  {openMega === link.key && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-[30px] z-50">
                      <div className="bg-white border border-black/10 shadow-[0_14px_40px_rgba(32,27,22,0.08)] w-[320px] max-h-[75vh] overflow-y-auto">
                        <div className="px-5 py-2">
                          {collections.map((c) => {
                            const slug = collectionSlug(c.href);
                            const products = collectionProducts[slug];
                            return (
                              <details
                                key={c.name}
                                className="group border-b border-black/10 last:border-b-0"
                                onToggle={(e) => {
                                  if (e.currentTarget.open) loadCollectionProducts(slug);
                                }}
                              >
                                <summary className="list-none cursor-pointer flex items-center justify-between gap-2 py-2.5 text-xs font-semibold tracking-wide text-ink hover:text-gold [&::-webkit-details-marker]:hidden">
                                  {c.name}
                                  <ChevronDownIcon
                                    size={14}
                                    className="shrink-0 transition-transform group-open:rotate-180"
                                  />
                                </summary>
                                <div className="pb-3">
                                  <Link
                                    href={c.href}
                                    className="block pb-2 text-xs font-semibold tracking-wide text-gold hover:underline"
                                  >
                                    View all {c.name}
                                  </Link>
                                  {products === "loading" || products === undefined ? (
                                    <p className="py-2 text-xs normal-case text-black/40">
                                      Loading…
                                    </p>
                                  ) : products === "error" || products.length === 0 ? (
                                    <p className="py-2 text-xs normal-case text-black/40">
                                      No products found.
                                    </p>
                                  ) : (
                                    // Capped to ~4-5 rows with its own scrollbar
                                    // instead of growing inline — a long
                                    // collection was stretching the whole panel
                                    // (and, on the mobile accordion, the page)
                                    // well past the viewport. The visible
                                    // scrollbar is deliberate: it's the cue that
                                    // there are more products below the fold.
                                    <div className="max-h-[240px] overflow-y-auto pr-1">
                                      {products.map((p) => (
                                        <Link
                                          key={p.slug}
                                          href={`/product/${p.slug}`}
                                          className="flex items-center gap-3 py-2 normal-case text-[13px] text-ink/70 border-b border-black/5 last:border-b-0 hover:text-gold"
                                        >
                                          <span className="relative shrink-0 w-9 h-9 overflow-hidden bg-[#f5f2ee] border border-black/5">
                                            {(p.thumbnailUrl || p.images[0]) && (
                                              <Image
                                                src={p.thumbnailUrl || p.images[0]}
                                                alt=""
                                                fill
                                                sizes="36px"
                                                className="object-cover"
                                              />
                                            )}
                                          </span>
                                          <span className="truncate">{p.name}</span>
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            const isMega = link.key in megaCategories;
            if (!isMega) {
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  className={navLinkClass(link.key)}
                  onClick={() => setActiveKey(link.key)}
                >
                  {dict.nav[link.key]}
                </Link>
              );
            }

            const products = megaProducts[link.key];
            return (
              <div
                key={link.key}
                className="relative"
                onMouseEnter={() => openMegaMenu(link.key)}
                onMouseLeave={scheduleCloseMega}
              >
                <Link
                  href={link.href}
                  className={navLinkClass(link.key, { isOpen: openMega === link.key })}
                  onFocus={() => openMegaMenu(link.key)}
                  onClick={() => setActiveKey(link.key)}
                >
                  {dict.nav[link.key]}
                </Link>
                {openMega === link.key && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-[30px] z-50">
                    {/* Single column, uppercase, height-capped with its own
                        scroll — measured directly off auracojewelry.com.
                        Every category (Necklaces down to the 4-item
                        Signature Sets) uses this same shape there; there is
                        no short/full split or multi-column layout. */}
                    <div className="bg-white border border-black/10 shadow-[0_14px_40px_rgba(32,27,22,0.08)] w-[380px] max-w-[92vw] max-h-[75vh] overflow-y-auto">
                      <div className="px-5 pt-4 pb-1">
                        <Link
                          href={link.href}
                          className="text-xs uppercase tracking-[0.055em] text-[#8f6a3c] hover:underline"
                        >
                          View all {dict.nav[link.key]}
                        </Link>
                      </div>
                      <div className="px-5 pb-4">
                        {products === "loading" || products === undefined ? (
                          <p className="py-3 text-xs normal-case text-black/40">
                            Loading…
                          </p>
                        ) : products === "error" || products.length === 0 ? (
                          <p className="py-3 text-xs normal-case text-black/40">
                            No products found.
                          </p>
                        ) : (
                          products.map((p) => (
                            <Link
                              key={p.slug}
                              href={`/product/${p.slug}`}
                              className="flex items-center gap-3 border-b border-black/10 last:border-b-0 py-2 uppercase text-xs tracking-[0.055em] text-ink hover:text-gold"
                            >
                              <span className="relative shrink-0 w-9 h-9 overflow-hidden bg-[#f5f2ee]">
                                {/* Products can be saved without images. The
                                    reference uses a dedicated lifestyle
                                    thumbnail here, distinct from the plain
                                    catalog shot used everywhere else. */}
                                {(p.thumbnailUrl || p.images[0]) && (
                                  <Image
                                    src={p.thumbnailUrl || p.images[0]}
                                    alt=""
                                    fill
                                    sizes="36px"
                                    className="object-cover"
                                  />
                                )}
                              </span>
                              <span className="truncate">{p.name}</span>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {/* No breakpoint gate — the rest of the desktop nav shows from
              `lg` (1024px) up, but this was gated to `xl` (1280px), so
              "Our Story" silently vanished on any viewport in between while
              every other nav item stayed visible. */}
          <div
            className="relative"
            onMouseEnter={() => setStoryOpen(true)}
            onMouseLeave={() => setStoryOpen(false)}
          >
            <button
              className={`whitespace-nowrap uppercase hover:text-gold transition-colors ${
                ourStoryLinks.some((l) => l.key === currentKey) ? "text-gold" : ""
              }`}
            >
              {dict.nav.ourStory}
            </button>
            {storyOpen && (
              <div className="absolute top-full left-0 pt-3 w-40">
                <div className="bg-white border border-black/10 shadow-lg py-2">
                  {ourStoryLinks.map((l) => (
                    <Link
                      key={l.key}
                      href={l.href}
                      onClick={() => setActiveKey(l.key)}
                      className={`block px-4 py-2 text-xs normal-case hover:bg-black/5 ${
                        currentKey === l.key ? "text-gold" : ""
                      }`}
                    >
                      {dict.nav[l.key]}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-1 text-sm shrink-0 min-[1200px]:gap-[5.6px]">
          <CurrencyPicker />
          {/* Visible at every breakpoint now (reference shows the account
              icon on mobile too, aria-label "Sign in or register") —
              hover-opened dropdown stays desktop-only in effect since
              onMouseEnter/onMouseLeave simply never fire on touch; tapping
              the icon on mobile falls through to the plain /login link,
              same as the mobile menu's existing "Account" row below.
              order-2 lg:order-none puts it after Cart on mobile (reference:
              cart x≈283, account x≈321) while leaving desktop's original
              source order (before Search) untouched. */}
          <div
            className="relative order-2 min-[1200px]:order-none"
            onMouseEnter={openAccountMenu}
            onMouseLeave={scheduleCloseAccountMenu}
          >
            <Link
              href="/login"
              aria-label={dict.nav.account}
              className="inline-flex h-10 w-10 items-center justify-center transition-colors hover:text-gold"
            >
              <UserIcon size={22.4} />
            </Link>
            {accountMenuOpen && (
              <div className="absolute top-full right-0 pt-3 w-40 z-50">
                <div className="bg-white border border-black/10 shadow-[0_14px_40px_rgba(32,27,22,0.08)] py-2">
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-xs normal-case hover:text-gold"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="block px-4 py-2 text-xs normal-case hover:text-gold"
                  >
                    Register
                  </Link>
                </div>
              </div>
            )}
          </div>
          {/* The reference keeps the search icon in place and drops a panel
              below it (`.header-search__dropdown`) rather than swapping the
              icon for an inline input in the same row. Desktop-only here —
              on mobile the search icon lives next to the hamburger instead
              (reference groups them on the left); see the grid's first
              column above for that copy. */}
          <div className="relative hidden min-[1200px]:block">
            <button
              aria-label={dict.nav.search}
              onClick={() => setSearchOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center hover:text-gold"
            >
              <SearchIcon size={22.4} />
            </button>
            {searchOpen && (
              <div className="absolute top-full right-0 z-50 w-[280px] max-w-[calc(100vw-2rem)] pt-3">
                <form
                  onSubmit={submitSearch}
                  className="flex items-center gap-2 border border-black/10 bg-white p-3 shadow-[0_14px_40px_rgba(32,27,22,0.08)]"
                >
                  <input
                    ref={(el) => {
                      if (el && el.offsetParent !== null) el.focus();
                    }}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onBlur={() => !query && setSearchOpen(false)}
                    placeholder={dict.nav.searchPlaceholder}
                    className="min-w-0 flex-1 border-b border-black/30 text-sm px-1 py-1 outline-none"
                  />
                  <button
                    type="submit"
                    aria-label={dict.nav.search}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center hover:text-gold"
                  >
                    <SearchIcon size={18} />
                  </button>
                </form>
              </div>
            )}
          </div>
          {/* Reference's header bag icon is a plain link to /cart, not a
              drawer trigger — the drawer still opens on its own right after
              Add to Bag (see CartProvider's addItem), just not from here.
              order-1 lg:order-none pairs it with Account's order-2 above to
              put Cart before Account on mobile without touching desktop's
              source order (Account, Search, Cart). */}
          <Link
            href="/cart"
            aria-label={dict.nav.cart}
            className="relative order-1 inline-flex h-10 w-10 items-center justify-center hover:text-gold min-[1200px]:order-none"
          >
            <BagIcon size={22.4} />
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] leading-none text-white">
              {totalQty}
            </span>
          </Link>
        </div>
      </div>
    </header>

      {/* A true slide-in drawer (fixed, capped width, own mini-header +
          backdrop), matching the reference's `.mobile-nav-drawer` — not the
          old in-flow panel that pushed the page down and reused the full
          site header inside it. Always mounted (not `{mobileOpen && ...}`)
          so the close transition can actually animate instead of the panel
          just vanishing; visibility is class-driven via `mobileOpen`.
          Rendered as a SIBLING of <header>, not nested inside it — that
          header has `backdrop-blur-sm`, and `backdrop-filter` establishes a
          new containing block for `position: fixed` descendants (same rule
          as `transform`), which trapped this panel inside the header's own
          64px box instead of the viewport when it lived in there.
          Measured off auracojewelry.com: panel width min(360px, 86vw),
          480ms cubic-bezier(0.32,0.72,0,1) slide, backdrop
          rgba(43,38,31,.38) + 4px blur. */}
      <button
        type="button"
        aria-label={dict.nav.closeMenu}
        onClick={() => setMobileOpen(false)}
        tabIndex={mobileOpen ? 0 : -1}
        className={`fixed inset-0 z-[100] bg-[rgba(43,38,31,0.38)] backdrop-blur-[4px] transition-opacity duration-300 min-[1200px]:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        aria-hidden={!mobileOpen}
        className={`fixed inset-y-0 left-0 z-[101] flex w-[min(360px,86vw)] flex-col overflow-hidden bg-white transition-transform duration-[480ms] ease-[cubic-bezier(0.32,0.72,0,1)] min-[1200px]:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#ece8e2] px-5 py-[13px]">
          <span className="font-serif-display text-[23px] tracking-[0.46px] text-[#28241f]">
            AURA &amp; CO
          </span>
          <button
            type="button"
            aria-label={dict.nav.closeMenu}
            onClick={() => setMobileOpen(false)}
            tabIndex={mobileOpen ? 0 : -1}
            className="flex h-10 w-10 items-center justify-center hover:text-gold"
          >
            <CloseIcon size={22} />
          </button>
        </div>
          <nav className="font-ui flex flex-1 flex-col overflow-y-auto px-4 py-2 text-sm tracking-wide uppercase">
            {navLinks.map((link) => {
              if (link.key === "collections") {
                const isOpen = mobileOpenMega === link.key;
                return (
                  <div key={link.key} className="border-b border-black/5">
                    <button
                      onClick={() => setMobileOpenMega(isOpen ? null : link.key)}
                      className={`w-full py-3 uppercase flex items-center justify-between hover:text-gold ${
                        currentKey === link.key ? "text-gold" : ""
                      }`}
                    >
                      {dict.nav[link.key]}
                      <ChevronDownIcon
                        size={16}
                        className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="pl-2 pb-2">
                        {collections.map((c) => {
                          const slug = collectionSlug(c.href);
                          const products = collectionProducts[slug];
                          return (
                            <details
                              key={c.name}
                              className="group border-b border-black/5 last:border-b-0"
                              onToggle={(e) => {
                                if (e.currentTarget.open) loadCollectionProducts(slug);
                              }}
                            >
                              <summary className="list-none cursor-pointer flex items-center justify-between py-2.5 text-xs font-semibold tracking-wide text-ink [&::-webkit-details-marker]:hidden">
                                {c.name}
                                <ChevronDownIcon
                                  size={14}
                                  className="shrink-0 transition-transform group-open:rotate-180"
                                />
                              </summary>
                              <div className="pl-2 pb-3">
                                <Link
                                  href={c.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="block py-2 text-xs normal-case text-gold font-semibold"
                                >
                                  View all {c.name}
                                </Link>
                                {products === "loading" || products === undefined ? (
                                  <p className="py-2 text-xs normal-case text-black/40">
                                    Loading…
                                  </p>
                                ) : products === "error" || products.length === 0 ? (
                                  <p className="py-2 text-xs normal-case text-black/40">
                                    No products found.
                                  </p>
                                ) : (
                                  <div className="max-h-[220px] overflow-y-auto pr-1">
                                    {products.map((p) => (
                                      <Link
                                        key={p.slug}
                                        href={`/product/${p.slug}`}
                                        onClick={() => setMobileOpen(false)}
                                        className="flex items-center gap-3 py-2 normal-case text-[13px] text-ink/70 hover:text-gold"
                                      >
                                        <span className="relative shrink-0 w-8 h-8 overflow-hidden bg-[#f5f2ee] border border-black/5">
                                          {(p.thumbnailUrl || p.images[0]) && (
                                            <Image
                                              src={p.thumbnailUrl || p.images[0]}
                                              alt=""
                                              fill
                                              sizes="32px"
                                              className="object-cover"
                                            />
                                          )}
                                        </span>
                                        <span className="truncate">{p.name}</span>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isMega = link.key in megaCategories;
              if (!isMega) {
                return (
                  <Link
                    key={link.key}
                    href={link.href}
                    onClick={() => {
                      setActiveKey(link.key);
                      setMobileOpen(false);
                    }}
                    className={`py-3 border-b border-black/5 hover:text-gold ${
                      currentKey === link.key ? "text-gold" : ""
                    }`}
                  >
                    {dict.nav[link.key]}
                  </Link>
                );
              }

              const isOpen = mobileOpenMega === link.key;
              const products = megaProducts[link.key];
              return (
                <div key={link.key} className="border-b border-black/5">
                  <button
                    onClick={() => {
                      const next = isOpen ? null : link.key;
                      setMobileOpenMega(next);
                      if (next) loadMega(next);
                    }}
                    className={`w-full py-3 uppercase flex items-center justify-between hover:text-gold ${
                      currentKey === link.key ? "text-gold" : ""
                    }`}
                  >
                    {dict.nav[link.key]}
                    <ChevronDownIcon
                      size={16}
                      className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="pl-2 pb-2">
                      <Link
                        href={link.href}
                        onClick={() => {
                          setActiveKey(link.key);
                          setMobileOpen(false);
                        }}
                        className="block py-2 text-xs normal-case text-gold font-semibold"
                      >
                        View all {dict.nav[link.key]}
                      </Link>
                      {products === "loading" || products === undefined ? (
                        <p className="py-2 text-xs normal-case text-black/40">
                          Loading…
                        </p>
                      ) : products === "error" || products.length === 0 ? (
                        <p className="py-2 text-xs normal-case text-black/40">
                          No products found.
                        </p>
                      ) : (
                        <div className="max-h-[220px] overflow-y-auto pr-1">
                          {products.map((p) => (
                            <Link
                              key={p.slug}
                              href={`/product/${p.slug}`}
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 py-2 normal-case text-[13px] text-ink/70 hover:text-gold"
                            >
                              <span className="relative shrink-0 w-8 h-8 overflow-hidden bg-[#f5f2ee] border border-black/5">
                                {(p.thumbnailUrl || p.images[0]) && (
                                  <Image
                                    src={p.thumbnailUrl || p.images[0]}
                                    alt=""
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                  />
                                )}
                              </span>
                              <span className="truncate">{p.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => setMobileStoryOpen((v) => !v)}
              className={`py-3 border-b border-black/5 uppercase flex items-center justify-between hover:text-gold ${
                ourStoryLinks.some((l) => l.key === currentKey) ? "text-gold" : ""
              }`}
            >
              {dict.nav.ourStory}
              <ChevronDownIcon
                size={16}
                className={`transition-transform ${
                  mobileStoryOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {mobileStoryOpen && (
              <div className="pl-4">
                {ourStoryLinks.map((l) => (
                  <Link
                    key={l.key}
                    href={l.href}
                    onClick={() => {
                      setActiveKey(l.key);
                      setMobileOpen(false);
                    }}
                    className={`block py-2.5 text-xs normal-case border-b border-black/5 hover:text-gold ${
                      currentKey === l.key ? "text-gold" : ""
                    }`}
                  >
                    {dict.nav[l.key]}
                  </Link>
                ))}
              </div>
            )}
            {/* Reference's drawer footer, measured directly off
                auracojewelry.com's `.site-nav__account--mobile`: a plain
                "Sign in | Register" row (icon + two gold links divided by a
                thin vertical rule) replaces the old single "Account" link
                entirely — the live site never shows a generic Account row
                on mobile. Font/color come straight off that element's
                computed style (16px/600 Source Sans 3, #a67c3d === --color-gold);
                tracking-normal overrides this <nav>'s own tracking-wide
                since the reference row has normal letter-spacing. */}
            <div className="mt-3 flex items-center gap-x-3 border-t border-b border-black/10 pt-[6px] pb-[13px]">
              <UserIcon size={18} className="shrink-0 text-gold" />
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="text-base font-semibold tracking-normal text-gold hover:underline"
              >
                Sign in
              </Link>
              <span className="h-4 w-px bg-black/15" aria-hidden="true" />
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="text-base font-semibold tracking-normal text-gold hover:underline"
              >
                Register
              </Link>
            </div>
            {/* Currency row: same `.currency-form` divider treatment as the
                reference (gold-light hairline at 35% opacity, not the
                neutral one above) with a flag+code+chevron trigger that
                matches CurrencyPicker's own desktop trigger spec exactly
                (that component hides itself below `md`, so this is a
                mobile-only copy of the same visuals wired to the same
                CurrencyProvider instead of a new picker). */}
            <div ref={mobileCurrencyRef} className="relative border-t border-gold-light/35 pt-[13px] pb-1">
              <button
                type="button"
                onClick={() => setMobileCurrencyOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={mobileCurrencyOpen}
                className="flex items-center gap-[7.68px] py-2 tracking-normal hover:text-gold"
              >
                <FlagIcon
                  locale={CURRENCY_FLAG[currency]}
                  className="h-[17px] w-[25px] rounded-[3px]"
                />
                <span className="text-[11px] font-medium">{currency}</span>
                <ChevronDownIcon
                  size={12}
                  className={`transition-transform ${mobileCurrencyOpen ? "rotate-180" : ""}`}
                />
              </button>
              {mobileCurrencyOpen && (
                <div className="w-[260px] max-w-full rounded-[14px] bg-white p-[7.2px] shadow-[0_16px_42px_rgba(31,26,20,0.16)]">
                  {currencies.map((c) => {
                    const active = c === currency;
                    const meta = currencyMeta[c];
                    return (
                      <button
                        key={c}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setCurrency(c);
                          setMobileCurrencyOpen(false);
                        }}
                        className={`flex w-full items-center gap-[11px] rounded-[10px] px-[11.52px] py-[10.88px] text-left normal-case tracking-normal hover:bg-black/5 ${
                          active ? "bg-[#f4ece3]" : ""
                        }`}
                      >
                        <FlagIcon
                          locale={CURRENCY_FLAG[c]}
                          className="h-[17px] w-[25px] shrink-0 rounded-[3px]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.44px] font-bold text-[#2b261f]">
                            {c}
                          </span>
                          <span className="block text-[12px] text-[#5c554a]">
                            {meta.name}
                          </span>
                        </span>
                        <span className="text-[13.12px] font-medium text-[#5c554a]">
                          {meta.symbol}
                        </span>
                        {active && (
                          <CheckIcon size={16} className="shrink-0 text-gold" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
      </div>
    </>
  );
}
