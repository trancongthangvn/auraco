"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { navLinks, ourStoryLinks, collections } from "@/data/site";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import CurrencyPicker from "@/components/currency/CurrencyPicker";
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
} from "@/components/icons";

// Top-level nav categories that get a real-product mega-menu on the live
// site (each `<li class="site-nav__item--mega">` there expands into a
// panel of ~product links plus a "View all X" link).
const megaCategories: Record<string, string> = {
  necklaces: "Necklaces",
  bracelets: "Bracelets",
  earrings: "Earrings",
  signatureSets: "Signature Sets",
};

/**
 * Nav keys whose mega-menu shows the whole category (sorted A-Z), instead of
 * the five-item preview — matches the reference site's dropdowns, which list
 * every product in the category, not just a handful.
 */
const FULL_LIST_MEGA = new Set(["necklaces", "bracelets", "earrings"]);

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
  const router = useRouter();
  const pathname = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const navLinkClass = (key: string) =>
    `whitespace-nowrap hover:text-gold transition-colors ${currentKey === key ? "text-gold" : ""}`;

  const loadMega = (key: string) => {
    const category = megaCategories[key];
    if (!category || megaProducts[key]) return;
    setMegaProducts((prev) => ({ ...prev, [key]: "loading" }));
    apiFetch<ApiProduct[]>(`/api/products?category=${encodeURIComponent(category)}`)
      .then((rows) => {
        const mapped = rows.map(toFullProduct);
        setMegaProducts((prev) => ({
          ...prev,
          // Necklaces, Bracelets and Earrings mirror the reference site: the
          // whole category, sorted A-Z. Signature Sets keeps the short
          // five-item preview.
          [key]: FULL_LIST_MEGA.has(key)
            ? mapped.sort((a, b) => a.name.localeCompare(b.name))
            : mapped.slice(0, 5),
        }));
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

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/catalog?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur-sm">
      {/* Always a 3-column grid (auto/1fr/auto), not flex+mx-auto: at every
          width there are exactly 3 visible children (hamburger+logo+icons on
          mobile, logo+nav+icons on desktop — the 4th is always display:none
          and drops out of grid flow), so auto-placement centers the logo
          truly regardless of how wide the two side clusters are. mx-auto
          alone couldn't do this once the icon cluster outweighed the
          hamburger button, which visibly off-centered the wordmark. */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-3 sm:px-4 lg:min-h-[64px] lg:gap-x-[20px]">
        <button
          aria-label={mobileOpen ? dict.nav.closeMenu : dict.nav.openMenu}
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden shrink-0 -ml-1 p-1 hover:text-gold"
        >
          {mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
        </button>

        <Link
          href="/"
          aria-label="AURA & CO"
          className="shrink-0 mx-auto font-serif-display text-[27px] font-normal leading-[27px] tracking-[-0.015em] text-ink"
        >
          AURA & CO
        </Link>

        <nav className="font-ui hidden lg:flex items-center justify-center gap-6 text-[13.2px] font-normal uppercase tracking-[0.055em] leading-[1.2] text-[#2b261f] lg:translate-y-[1.5px]">
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
                                    products.map((p) => (
                                      <Link
                                        key={p.slug}
                                        href={`/product/${p.slug}`}
                                        className="flex items-center gap-3 py-2 normal-case text-[13px] text-ink/70 border-b border-black/5 last:border-b-0 hover:text-gold"
                                      >
                                        <span className="relative shrink-0 w-9 h-9 overflow-hidden bg-[#f5f2ee] border border-black/5">
                                          {p.images[0] && (
                                            <Image
                                              src={p.images[0]}
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
                className={`relative ${link.key === "bestSellers" ? "hidden xl:block" : ""}`}
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
                    <div
                      className={`bg-white border border-black/10 shadow-[0_14px_40px_rgba(32,27,22,0.08)] max-w-[92vw] ${
                        FULL_LIST_MEGA.has(link.key)
                          ? // Full category in one go, no inner scroll, at the
                            // site owner's request — the reference site caps
                            // this height and scrolls; we do not. Wide enough
                            // for two columns so a long category (12+ items)
                            // reads as ~5-6 per column instead of one long list.
                            "w-[640px]"
                          : "w-[420px] max-h-[75vh] overflow-y-auto"
                      }`}
                    >
                      <div className="px-5 pt-4 pb-1">
                        <Link
                          href={link.href}
                          className={`hover:underline ${
                            FULL_LIST_MEGA.has(link.key)
                              ? "text-xs uppercase tracking-[0.055em] text-[#8f6a3c]"
                              : "text-xs font-semibold tracking-wide text-gold"
                          }`}
                        >
                          View all {dict.nav[link.key]}
                        </Link>
                      </div>
                      <div
                        className={`px-5 pb-4 ${
                          FULL_LIST_MEGA.has(link.key) ? "columns-2 gap-x-6" : ""
                        }`}
                      >
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
                              className={`flex items-center gap-3 border-b border-black/10 last:border-b-0 hover:text-gold ${
                                FULL_LIST_MEGA.has(link.key)
                                  ? "break-inside-avoid py-2 uppercase text-xs tracking-[0.055em] text-ink"
                                  : "py-2 normal-case text-[13px] text-ink/70 border-black/5"
                              }`}
                            >
                              <span
                                className={`relative shrink-0 w-9 h-9 overflow-hidden bg-[#f5f2ee] ${
                                  FULL_LIST_MEGA.has(link.key)
                                    ? ""
                                    : "border border-black/5"
                                }`}
                              >
                                {/* Products can be saved without images. */}
                                {p.images[0] && (
                                  <Image
                                    src={p.images[0]}
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
          <div
            className="relative hidden xl:block"
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

        <div className="flex items-center gap-1 text-sm shrink-0 lg:gap-[5.6px]">
          <CurrencyPicker />
          <Link
            href="/login"
            aria-label={dict.nav.account}
            className="hidden sm:inline-flex h-10 w-10 items-center justify-center hover:text-gold"
          >
            <UserIcon size={22.4} />
          </Link>
          {searchOpen ? (
            <form onSubmit={submitSearch} className="flex items-center">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder={dict.nav.searchPlaceholder}
                className="border-b border-black/30 text-sm px-1 py-1 w-28 sm:w-40 lg:w-48 outline-none"
              />
            </form>
          ) : (
            <button
              aria-label={dict.nav.search}
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center hover:text-gold"
            >
              <SearchIcon size={22.4} />
            </button>
          )}
          <Link
            href="/cart"
            aria-label={dict.nav.cart}
            className="relative inline-flex h-10 w-10 items-center justify-center hover:text-gold"
          >
            <BagIcon size={22.4} />
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[9px] leading-none text-white">
              0
            </span>
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-black/5 bg-white">
          <nav className="font-ui flex flex-col px-4 py-2 text-sm tracking-wide uppercase">
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
                                  products.map((p) => (
                                    <Link
                                      key={p.slug}
                                      href={`/product/${p.slug}`}
                                      onClick={() => setMobileOpen(false)}
                                      className="flex items-center gap-3 py-2 normal-case text-[13px] text-ink/70 hover:text-gold"
                                    >
                                      <span className="relative shrink-0 w-8 h-8 overflow-hidden bg-[#f5f2ee] border border-black/5">
                                        {p.images[0] && (
                                          <Image
                                            src={p.images[0]}
                                            alt=""
                                            fill
                                            sizes="32px"
                                            className="object-cover"
                                          />
                                        )}
                                      </span>
                                      <span className="truncate">{p.name}</span>
                                    </Link>
                                  ))
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
                        products.map((p) => (
                          <Link
                            key={p.slug}
                            href={`/product/${p.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-3 py-2 normal-case text-[13px] text-ink/70 hover:text-gold"
                          >
                            <span className="relative shrink-0 w-8 h-8 overflow-hidden bg-[#f5f2ee] border border-black/5">
                              <Image
                                src={p.images[0]}
                                alt=""
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </span>
                            <span className="truncate">{p.name}</span>
                          </Link>
                        ))
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
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="py-3 flex items-center gap-2 normal-case hover:text-gold"
            >
              <UserIcon size={16} /> {dict.nav.account}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
