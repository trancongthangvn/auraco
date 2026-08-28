"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";

type LanguageContextValue = {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Wraps the storefront (not admin — admin stays Vietnamese-only). Locale is
 * persisted in a cookie so Server Components (which render the actual page
 * content) can read the same locale via `lib/i18n/server.ts`'s getLocale().
 */
export default function LanguageProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = (next: Locale) => {
    if (next === locale) return;
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Server Components read the locale from the cookie, so they need a
    // fresh render to pick up the change.
    router.refresh();
  };

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, dict: getDictionary(locale), setLocale }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

/** Shortcut for components that only need the dictionary. */
export function useDictionary(): Dictionary {
  return useLanguage().dict;
}
