"use client";

import { useState } from "react";
import { GlobeIcon, ChevronDownIcon } from "@/components/icons";
import { locales, localeLabels } from "@/lib/i18n/config";
import { useLanguage } from "./LanguageProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="hidden md:inline-flex items-center gap-1.5 hover:text-gold"
      >
        <GlobeIcon size={16} />
        {locale.toUpperCase()}
        <ChevronDownIcon size={12} />
      </button>
      {open && (
        <div className="absolute top-full right-0 pt-3 w-40 z-50">
          <ul
            role="listbox"
            className="bg-white border border-black/10 shadow-lg py-2"
          >
            {locales.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l === locale}
                  onClick={() => {
                    setLocale(l);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs hover:bg-black/5 ${
                    l === locale ? "text-gold" : ""
                  }`}
                >
                  {localeLabels[l]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
