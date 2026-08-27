"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { navLinks, ourStoryLinks } from "@/data/site";
import { SearchIcon, UserIcon, BagIcon, GlobeIcon } from "@/components/icons";

export default function Header() {
  const [storyOpen, setStoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/catalog?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
  };

  return (
    <header className="border-b border-black/5">
      <div className="mx-auto max-w-[1400px] flex items-center justify-between px-6 py-4 gap-4">
        <Link
          href="/"
          className="font-serif-display text-2xl tracking-[0.15em] shrink-0"
        >
          AURA & CO
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

        <div className="flex items-center gap-5 text-sm shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5">
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
                className="border-b border-black/30 text-sm px-1 py-1 w-36 sm:w-48 outline-none"
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
          <Link href="/login" aria-label="Account" className="hover:text-gold">
            <UserIcon size={18} />
          </Link>
          <Link href="/cart" aria-label="Cart" className="hover:text-gold">
            <BagIcon size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
