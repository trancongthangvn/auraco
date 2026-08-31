"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  CURRENCY_STORAGE_KEY,
  defaultCurrency,
  isCurrency,
  type Currency,
} from "@/lib/currency";

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
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

  const setCurrency = (next: Currency) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, next);
    } catch {
      // Nothing to do: the choice simply doesn't persist across visits.
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
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
