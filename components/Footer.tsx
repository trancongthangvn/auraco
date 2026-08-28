"use client";

import Link from "next/link";
import { useState } from "react";
import { footerLinks } from "@/data/site";
import { ArrowRightIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";

export default function Footer() {
  const dict = useDictionary();
  const [email, setEmail] = useState("");

  return (
    <footer className="bg-white text-ink border-t border-black/5">
      <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-10 grid gap-10 sm:grid-cols-3">
        <div>
          <h3 className="font-serif-display text-[28px] uppercase tracking-[0.01em] mb-4">
            {dict.footer.newsletterHeading}
          </h3>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex border-b border-black/20 pb-2"
          >
            <input
              type="email"
              required
              placeholder={dict.footer.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent flex-1 text-sm placeholder:text-black/40 outline-none"
            />
            <button type="submit" aria-label={dict.footer.subscribe} className="text-ink">
              <ArrowRightIcon size={18} />
            </button>
          </form>
          <p className="text-xs text-black/50 mt-3">
            {dict.footer.newsletterDisclaimer}
          </p>
        </div>

        <div>
          <h3 className="text-gold text-xs uppercase tracking-[0.12em] mb-4">
            {dict.footer.shop}
          </h3>
          <ul className="space-y-2 text-xs">
            {footerLinks.shop.map((l) => (
              <li key={l.key}>
                <Link href={l.href} className="text-black/60 hover:text-ink transition-colors">
                  {dict.footer[l.key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-gold text-xs uppercase tracking-[0.12em] mb-4">
            {dict.footer.policies}
          </h3>
          <ul className="space-y-2 text-xs">
            {footerLinks.policies.map((l) => (
              <li key={l.key}>
                <Link href={l.href} className="text-black/60 hover:text-ink transition-colors">
                  {dict.footer[l.key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-8 text-sm text-black/40">
        {dict.footer.copyright}
      </div>
    </footer>
  );
}
