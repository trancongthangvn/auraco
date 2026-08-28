import type { Locale } from "./config";

/** Maps our app locale to the BCP-47 tag Intl/toLocaleDateString expects. */
const DATE_LOCALES: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  it: "it-IT",
};

export function dateLocale(locale: Locale): string {
  return DATE_LOCALES[locale] ?? DATE_LOCALES.en;
}
