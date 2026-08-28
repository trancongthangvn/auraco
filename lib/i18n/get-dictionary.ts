import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";
import en from "./dictionaries/en";
import fr from "./dictionaries/fr";
import de from "./dictionaries/de";
import es from "./dictionaries/es";
import it from "./dictionaries/it";

const dictionaries: Record<Locale, Dictionary> = { en, fr, de, es, it };

/** Pure lookup, no I/O — safe to call from both Server and Client Components. */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export type { Dictionary };
