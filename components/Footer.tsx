"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { footerLinks } from "@/data/site";
import { ChevronDownIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import PaymentIcons from "@/components/PaymentIcons";
import { apiFetch } from "@/lib/api";
import { renderPromoNumeric } from "@/lib/renderPromoNumeric";

/** Turns the literal words "Security"/"Privacy" in the disclaimer sentence
 *  into links to those policy pages, leaving the rest of the (translated)
 *  sentence as plain text either way. */
function renderDisclaimer(text: string) {
  return text.split(/(Security|Privacy)/g).map((part, i) =>
    part === "Security" ? (
      <Link key={i} href="/pages/security-policy" className="text-ink underline underline-offset-2 hover:text-gold">
        Security
      </Link>
    ) : part === "Privacy" ? (
      <Link key={i} href="/pages/privacy-policy" className="text-ink underline underline-offset-2 hover:text-gold">
        Privacy
      </Link>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

const HEADING =
  "font-ui flex w-full items-center justify-between gap-3 text-[13.6px] font-normal uppercase leading-[21.08px] tracking-[1.632px] text-gold py-[13.6px] transition-opacity hover:opacity-70 md:pointer-events-none md:mb-2 md:py-0";
const LINK_LIST = "font-ui space-y-[5.6px] pb-[13.6px] md:pb-0";
const LINK =
  "text-[12px] font-normal uppercase leading-[18.6px] tracking-[1.44px] text-[#5c554a] transition-colors hover:text-ink";

export default function Footer() {
  const dict = useDictionary();
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [contact, setContact] = useState<{ email: string | null; phone: string | null }>({
    email: null,
    phone: null,
  });

  // Site-wide contact address, admin-editable in app/admin/cai-dat-web —
  // shown only once an admin has actually set one (public endpoint returns
  // null for either field until then), same as the OG image fetch in
  // app/layout.tsx's generateMetadata.
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ contactEmail?: string | null; contactPhone?: string | null }>(
      "/api/content/site-settings"
    )
      .then((data) => {
        if (cancelled) return;
        setContact({ email: data.contactEmail ?? null, phone: data.contactPhone ?? null });
      })
      .catch(() => {
        // Decorative — a failed fetch just leaves the contact line hidden.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="relative mt-8 overflow-hidden border-t border-black/35 bg-white px-4 pt-8 pb-10 text-ink">
      <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-[352px]">
          <h2 className="font-serif-display mb-4 text-[28px] font-normal uppercase leading-[29.4px] tracking-[0.28px] text-[#28241f]">
            {renderPromoNumeric(dict.footer.newsletterHeading)}
          </h2>
          <form onSubmit={(e) => e.preventDefault()} className="grid gap-[13.6px]">
            <div className="flex items-center gap-2 border-b border-ink pb-[5.6px]">
              <input
                type="email"
                required
                placeholder={dict.footer.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-ui min-w-0 flex-1 bg-transparent py-[5.6px] text-[13px] font-light leading-[20.15px] tracking-[0.13px] text-[#28241f] outline-none placeholder:text-[#5c554a] placeholder:opacity-85"
              />
              {/* The reference draws this arrow as a text glyph, not an icon — at
                  21.6px it sits taller than any of our SVG arrows. */}
              <button
                type="submit"
                aria-label={dict.footer.subscribe}
                className="shrink-0 px-[2.4px] py-1 text-[21.6px] leading-none text-ink transition-colors hover:text-gold"
              >
                &rarr;
              </button>
            </div>
            <label className="font-ui grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-[12px] font-light leading-[18px] tracking-[0.12px] text-[#6e6963]">
              <input
                type="checkbox"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-[2.4px] h-[13px] w-[13px] accent-gold"
              />
              <span>{renderDisclaimer(dict.footer.newsletterDisclaimer)}</span>
            </label>
          </form>
        </div>

        <div className="border-b border-gold-light/35 md:border-b-0">
          <button
            type="button"
            onClick={() => setShopOpen((v) => !v)}
            aria-expanded={shopOpen}
            className={HEADING}
          >
            {dict.footer.shop}
            <ChevronDownIcon
              size={12}
              className={`transition-transform md:hidden ${shopOpen ? "rotate-180" : ""}`}
            />
          </button>
          <ul className={`${LINK_LIST} ${shopOpen ? "block" : "hidden"} md:block`}>
            {footerLinks.shop.map((l) => (
              <li key={l.key}>
                <Link href={l.href} className={LINK}>
                  {dict.footer[l.key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setPoliciesOpen((v) => !v)}
            aria-expanded={policiesOpen}
            className={HEADING}
          >
            {dict.footer.policies}
            <ChevronDownIcon
              size={12}
              className={`transition-transform md:hidden ${policiesOpen ? "rotate-180" : ""}`}
            />
          </button>
          <ul className={`${LINK_LIST} ${policiesOpen ? "block" : "hidden"} md:block`}>
            {footerLinks.policies.map((l) => (
              <li key={l.key}>
                <Link href={l.href} className={LINK}>
                  {dict.footer[l.key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-[1100px]">
        <PaymentIcons />
      </div>

      {(contact.email || contact.phone) && (
        <p className="font-ui mx-auto mt-4 max-w-[1100px] text-[13px] font-light leading-[20px] tracking-[0.13px] text-[#6e6963]">
          {dict.footer.contact}:{" "}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="underline underline-offset-2 hover:text-gold"
            >
              {contact.email}
            </a>
          )}
          {contact.email && contact.phone && " · "}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="underline underline-offset-2 hover:text-gold">
              {contact.phone}
            </a>
          )}
        </p>
      )}

      <p className="font-ui mx-auto mt-6 max-w-[1100px] text-[14px] font-light leading-[21px] tracking-[0.14px] text-[#6e6963]">
        {dict.footer.copyright}
      </p>
    </footer>
  );
}
