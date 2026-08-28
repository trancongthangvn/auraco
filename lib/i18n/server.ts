import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { getDictionary } from "./get-dictionary";

/** Reads the visitor's chosen locale from the cookie set by LanguageProvider. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

/** Convenience: locale + its dictionary in one call for Server Components/pages. */
export async function getServerDictionary() {
  const locale = await getLocale();
  return { locale, dict: getDictionary(locale) };
}
