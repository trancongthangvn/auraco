"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import FlagIcon, { type FlagKind } from "@/components/i18n/FlagIcon";
import { currencies, currencyMeta } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";

/** Each currency's flag has no locale equivalent (GBP reuses the UK flag
 *  FlagIcon already draws for "en"). */
const CURRENCY_FLAG: Record<(typeof currencies)[number], FlagKind> = {
  USD: "us",
  EUR: "eu",
  GBP: "en",
};

/**
 * Header currency picker — measured on auracojewelry.com's own
 * `.currency-picker`: trigger flag+code, a 14px-radius white dropdown card
 * (shadow `0 16px 42px rgba(31,26,20,.16)`) holding one row per currency
 * (flag, bold code + grey full name, grey symbol, gold check on the active
 * row, cream `#f4ece3`-tinted background on that row).
 */
export default function CurrencyPicker() {
  const { currency, setCurrency, activeCurrencies } = useCurrency();
  const visibleCurrencies = currencies.filter((c) => activeCurrencies[c]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click-outside-to-close — this was hover-only before (open/close on
  // mouseenter/mouseleave), which works for a mouse but leaves no way to
  // dismiss the dropdown on a touch device other than tapping the trigger
  // again: a tap elsewhere on the page did nothing, unlike the reference.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    // Explicit request: this used to open on mouseenter (hover), so just
    // moving the cursor across it — no click needed — popped it open. Now
    // it only opens on an actual click of the trigger button below; closing
    // is still click-outside (see the effect above) or picking an option.
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="hidden h-10 items-center gap-[7.68px] px-1 hover:text-gold md:inline-flex"
      >
        <FlagIcon locale={CURRENCY_FLAG[currency]} className="h-[17px] w-[25px] rounded-[3px]" />
        <span className="text-[11px] font-medium">{currency}</span>
        <ChevronDownIcon size={12} />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 w-[260px] pt-3">
          <ul
            role="listbox"
            className="rounded-[14px] bg-white p-[7.2px] shadow-[0_16px_42px_rgba(31,26,20,0.16)]"
          >
            {visibleCurrencies.map((c) => {
              const active = c === currency;
              const meta = currencyMeta[c];
              return (
                <li key={c}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setCurrency(c);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-[11px] rounded-[10px] px-[11.52px] py-[10.88px] text-left hover:bg-black/5 ${
                      active ? "bg-[#f4ece3]" : ""
                    }`}
                  >
                    <FlagIcon locale={CURRENCY_FLAG[c]} className="h-[17px] w-[25px] shrink-0 rounded-[3px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.44px] font-bold text-[#2b261f]">
                        {c}
                      </span>
                      <span className="block text-[12px] text-[#5c554a]">
                        {meta.name}
                      </span>
                    </span>
                    {/* No checkmark — its variable width (present only on
                        the active row) was what threw the symbol column out
                        of alignment between rows. The row's own tinted
                        background (bg-[#f4ece3] above) is already the
                        active-row indicator, so the symbol can sit in the
                        same fixed position on every row instead. */}
                    <span className="text-[13.12px] font-medium text-[#5c554a]">
                      {meta.symbol}
                    </span>
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
