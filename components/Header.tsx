"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { navLinks, ourStoryLinks } from "@/data/site";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
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
 * Nav keys whose mega-menu shows the whole category (sorted A-Z, scrollable)
 * with the reference site's row styling, instead of the five-item preview.
 * Currently only Necklaces, by the site owner's explicit choice.
 */
const FULL_LIST_MEGA = new Set(["necklaces"]);

export default function Header() {
  const dict = useDictionary();
  const [storyOpen, setStoryOpen] = useState(false);
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [mobileOpenMega, setMobileOpenMega] = useState<string | null>(null);
  const [megaProducts, setMegaProducts] = useState<
    Record<string, FullProduct[] | "loading" | "error">
  >({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileStoryOpen, setMobileStoryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMega = (key: string) => {
    const category = megaCategories[key];
    if (!category || megaProducts[key]) return;
    setMegaProducts((prev) => ({ ...prev, [key]: "loading" }));
    apiFetch<ApiProduct[]>(`/api/products?category=${encodeURIComponent(category)}`)
      .then((rows) => {
        const mapped = rows.map(toFullProduct);
        setMegaProducts((prev) => ({
          ...prev,
          // Necklaces mirrors the reference site: the full category, sorted
          // A-Z, in a scrollable panel. The other three menus keep the short
          // five-item preview — deliberate, confirmed with the site owner.
          [key]: FULL_LIST_MEGA.has(key)
            ? mapped.sort((a, b) => a.name.localeCompare(b.name))
            : mapped.slice(0, 5),
        }));
      })
      .catch(() => {
        setMegaProducts((prev) => ({ ...prev, [key]: "error" }));
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
    <header className="border-b border-black/5 relative z-40">
      <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-2 px-4 py-4 sm:px-6">
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
          className="shrink-0 mx-auto lg:mx-0 font-serif-display text-[27px] leading-none tracking-[-0.015em] text-ink"
        >
          AURA & CO
        </Link>

        <nav className="hidden lg:flex items-center gap-8 text-sm tracking-wide uppercase">
          {navLinks.map((link) => {
            const isMega = link.key in megaCategories;
            if (!isMega) {
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  className="hover:text-gold transition-colors"
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
                  className="hover:text-gold transition-colors"
                  onFocus={() => openMegaMenu(link.key)}
                >
                  {dict.nav[link.key]}
                </Link>
                {openMega === link.key && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-[30px] z-50">
                    <div
                      className={`bg-white border border-black/10 shadow-[0_14px_40px_rgba(32,27,22,0.08)] max-w-[92vw] ${
                        FULL_LIST_MEGA.has(link.key)
                          ? // Full category, shown in one go — no inner scroll,
                            // by the site owner's request. The reference site
                            // caps this at 210px and scrolls; we do not.
                            "w-[440px]"
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
                              className={`flex items-center gap-3 border-b border-black/10 last:border-b-0 hover:text-gold ${
                                FULL_LIST_MEGA.has(link.key)
                                  ? "py-2 uppercase text-xs tracking-[0.055em] text-ink"
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
            className="relative"
            onMouseEnter={() => setStoryOpen(true)}
            onMouseLeave={() => setStoryOpen(false)}
          >
            <button className="hover:text-gold transition-colors">
              {dict.nav.ourStory}
            </button>
            {storyOpen && (
              <div className="absolute top-full left-0 pt-3 w-40">
                <div className="bg-white border border-black/10 shadow-lg py-2">
                  {ourStoryLinks.map((l) => (
                    <Link
                      key={l.key}
                      href={l.href}
                      className="block px-4 py-2 text-xs normal-case hover:bg-black/5"
                    >
                      {dict.nav[l.key]}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 text-sm shrink-0">
          <LanguageSwitcher />
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
              className="hover:text-gold"
            >
              <SearchIcon size={18} />
            </button>
          )}
          <Link
            href="/login"
            aria-label={dict.nav.account}
            className="hidden sm:inline-flex hover:text-gold"
          >
            <UserIcon size={18} />
          </Link>
          <Link href="/cart" aria-label={dict.nav.cart} className="hover:text-gold">
            <BagIcon size={18} />
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-black/5 bg-white">
          <nav className="flex flex-col px-4 py-2 text-sm tracking-wide uppercase">
            {navLinks.map((link) => {
              const isMega = link.key in megaCategories;
              if (!isMega) {
                return (
                  <Link
                    key={link.key}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 border-b border-black/5 hover:text-gold"
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
                    className="w-full py-3 flex items-center justify-between hover:text-gold"
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
                        onClick={() => setMobileOpen(false)}
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
              className="py-3 border-b border-black/5 flex items-center justify-between hover:text-gold"
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
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 text-xs normal-case border-b border-black/5 hover:text-gold"
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
