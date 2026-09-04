"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  CURRENCY_STORAGE_KEY,
  defaultCurrency,
  defaultCurrencyActive,
  defaultCurrencyRates,
  isCurrency,
  type Currency,
} from "@/lib/currency";
import { apiFetch } from "@/lib/api";

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  /** USD list price × rates[currency] = displayed price. Starts at 1/1/1
   *  (no conversion) until the site-settings fetch below resolves, so the
   *  first paint never shows a stale or wrong-looking number. */
  rates: Record<Currency, number>;
  /** Which currencies the picker should offer — Admin → Cài đặt website →
   *  Tỉ giá quy đổi → cột Active. USD is always true (see lib/currency.ts). */
  activeCurrencies: Record<Currency, boolean>;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/**
 * Client-only, unlike LanguageProvider: this never needs to change how a
 * Server Component renders (see lib/currency.ts — there is no server-side
 * price conversion to trigger), so a localStorage-backed useState is enough.
 * Starting at the USD default on every render keeps the server and first
 * client paint in agreement; the stored preference is applied after mount.
 */
export default function CurrencyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState<Currency>(defaultCurrency);
  const [rates, setRates] = useState<Record<Currency, number>>(defaultCurrencyRates);
  const [activeCurrencies, setActiveCurrencies] =
    useState<Record<Currency, boolean>>(defaultCurrencyActive);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
        if (isCurrency(stored)) setCurrencyState(stored);
      } catch {
        // Storage unavailable — stay on the default.
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{
      currencyRates?: Record<string, number> | null;
      currencyActive?: Record<string, boolean> | null;
    }>("/api/content/site-settings")
      .then((data) => {
        if (cancelled) return;
        if (data.currencyRates) {
          setRates((prev) => ({ ...prev, ...data.currencyRates }));
        }
        if (data.currencyActive) {
          // USD forced true — see defaultCurrencyActive's own comment.
          const next = { ...defaultCurrencyActive, ...data.currencyActive, USD: true };
          setActiveCurrencies(next);
          // The customer's stored/current pick just got turned off under
          // them — fall back to USD rather than leave the picker showing a
          // currency it no longer offers.
          setCurrencyState((cur) => (next[cur] ? cur : defaultCurrency));
        }
      })
      .catch(() => {
        // Keep the no-conversion defaults — decorative fetch, not worth an
        // error state on every browsing page.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = (next: Currency) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, next);
    } catch {
      // Nothing to do: the choice simply doesn't persist across visits.
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, activeCurrencies }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
}
