"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { navLinks, ourStoryLinks } from "@/data/site";
import {
  SearchIcon,
  UserIcon,
  BagIcon,
  GlobeIcon,
  MenuIcon,
  CloseIcon,
  ChevronDownIcon,
} from "@/components/icons";

export default function Header() {
  const [storyOpen, setStoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileStoryOpen, setMobileStoryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

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
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden shrink-0 -ml-1 p-1 hover:text-gold"
        >
          {mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
        </button>

        <Link
          href="/"
          aria-label="AURA & CO"
          className="shrink-0 mx-auto lg:mx-0"
        >
          <Image
            src="/images/brand/logo-badge.png"
            alt="AURA & CO"
            width={48}
            height={48}
            className="h-10 w-10 sm:h-12 sm:w-12"
            priority
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-8 text-sm tracking-wide uppercase">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-gold transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div
            className="relative"
            onMouseEnter={() => setStoryOpen(true)}
            onMouseLeave={() => setStoryOpen(false)}
          >
            <button className="hover:text-gold transition-colors">
              Our Story
            </button>
            {storyOpen && (
              <div className="absolute top-full left-0 pt-3 w-40">
                <div className="bg-white border border-black/10 shadow-lg py-2">
                  {ourStoryLinks.map((l) => (
                    <Link
                      key={l.label}
                      href={l.href}
                      className="block px-4 py-2 text-xs normal-case hover:bg-black/5"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 text-sm shrink-0">
          <span className="hidden md:inline-flex items-center gap-1.5">
            <GlobeIcon size={16} />
            USD
          </span>
          {searchOpen ? (
            <form onSubmit={submitSearch} className="flex items-center">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder="Search products..."
                className="border-b border-black/30 text-sm px-1 py-1 w-28 sm:w-40 lg:w-48 outline-none"
              />
            </form>
          ) : (
            <button
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="hover:text-gold"
            >
              <SearchIcon size={18} />
            </button>
          )}
          <Link
            href="/login"
            aria-label="Account"
            className="hidden sm:inline-flex hover:text-gold"
          >
            <UserIcon size={18} />
          </Link>
          <Link href="/cart" aria-label="Cart" className="hover:text-gold">
            <BagIcon size={18} />
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-black/5 bg-white">
          <nav className="flex flex-col px-4 py-2 text-sm tracking-wide uppercase">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="py-3 border-b border-black/5 hover:text-gold"
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => setMobileStoryOpen((v) => !v)}
              className="py-3 border-b border-black/5 flex items-center justify-between hover:text-gold"
            >
              Our Story
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
                    key={l.label}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 text-xs normal-case border-b border-black/5 hover:text-gold"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="py-3 flex items-center gap-2 normal-case hover:text-gold"
            >
              <UserIcon size={16} /> Account
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
