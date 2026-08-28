import LanguageProvider from "@/components/i18n/LanguageProvider";
import { getLocale } from "@/lib/i18n/server";

/**
 * Scoped to the customer-facing routes only (not /admin, which stays
 * Vietnamese-only and must not pay the cost of this layout's cookies() read
 * forcing dynamic rendering — see the locale cookie in LanguageProvider).
 */
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return <LanguageProvider locale={locale}>{children}</LanguageProvider>;
}
