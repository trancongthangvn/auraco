"use client";

import { useState } from "react";
import { ChevronDownIcon, CheckIcon } from "@/components/icons";
import FlagIcon from "./FlagIcon";
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
        className="hidden h-10 items-center gap-1.5 px-1 hover:text-gold md:inline-flex"
      >
        <FlagIcon locale={locale} className="h-[14px] w-[21px]" />
        {locale.toUpperCase()}
        <ChevronDownIcon size={12} />
      </button>
      {open && (
        <div className="absolute top-full right-0 pt-3 w-[280px] z-50">
          <ul
            role="listbox"
            className="rounded-xl border border-black/10 bg-white p-2 shadow-lg"
          >
            {locales.map((l) => {
              const active = l === locale;
              return (
                <li key={l}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setLocale(l);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-black/5 ${
                      active ? "bg-gold/10" : ""
                    }`}
                  >
                    <FlagIcon locale={l} className="h-5 w-7 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">
                        {localeLabels[l]}
                      </span>
                      <span className="block text-xs text-black/50">
                        {l.toUpperCase()}
                      </span>
                    </span>
                    {active && (
                      <CheckIcon size={16} className="shrink-0 text-gold" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
