import type { Metadata } from "next";
import LanguageProvider from "@/components/i18n/LanguageProvider";
import CurrencyProvider from "@/components/currency/CurrencyProvider";
import CartProvider from "@/components/cart/CartProvider";
import CartDrawer from "@/components/cart/CartDrawer";
import { getLocale } from "@/lib/i18n/server";
import { serverApiFetch } from "@/lib/server-api";

/**
 * Overrides the root layout's default OG image with the admin-set one
 * (Cài đặt web > Ảnh chia sẻ mạng xã hội) when set. Lives here rather than
 * the root layout because this layout already reads cookies() (locale) and
 * is dynamic regardless — adding this fetch costs nothing extra here, but
 * would have forced /admin/* out of static rendering too if it were in the
 * root layout, for an image admin pages never use.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await serverApiFetch<{ ogImageUrl?: string | null }>(
      "/api/content/site-settings"
    );
    if (settings.ogImageUrl) {
      return {
        openGraph: { images: [settings.ogImageUrl] },
        twitter: { images: [settings.ogImageUrl] },
      };
    }
  } catch {
    // Falls back to the root layout's default image.
  }
  return {};
}

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
  return (
    <LanguageProvider locale={locale}>
      <CurrencyProvider>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
