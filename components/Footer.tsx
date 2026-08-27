"use client";

import Link from "next/link";
import { useState } from "react";
import { footerLinks, ourStoryLinks } from "@/data/site";

export default function Footer() {
  const [email, setEmail] = useState("");

  return (
    <footer className="bg-[#2b261f] text-white/80">
      <div className="mx-auto max-w-[1400px] px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="text-white text-sm tracking-[0.15em] mb-4">
            SIGN UP FOR 10% OFF
          </h3>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex border-b border-white/30 pb-2"
          >
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent flex-1 text-sm placeholder:text-white/40 outline-none"
            />
            <button type="submit" aria-label="Subscribe" className="text-white">
              →
            </button>
          </form>
          <p className="text-xs text-white/40 mt-3">
            By signing up, you agree to our Security & Privacy.
          </p>
        </div>

        <div>
          <h3 className="text-white text-sm tracking-[0.15em] mb-4">SHOP</h3>
          <ul className="space-y-2 text-sm">
            {footerLinks.shop.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="hover:text-white">
                  {l.label.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white text-sm tracking-[0.15em] mb-4">
            OUR STORY
          </h3>
          <ul className="space-y-2 text-sm">
            {ourStoryLinks.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="hover:text-white">
                  {l.label.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white text-sm tracking-[0.15em] mb-4">
            POLICIES
          </h3>
          <ul className="space-y-2 text-sm">
            {footerLinks.policies.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="hover:text-white">
                  {l.label.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        © 2026 AURA & CO. All rights reserved.
      </div>
    </footer>
  );
}
