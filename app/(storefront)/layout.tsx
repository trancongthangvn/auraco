import type { Metadata } from "next";
import LanguageProvider from "@/components/i18n/LanguageProvider";
import CurrencyProvider from "@/components/currency/CurrencyProvider";
import CartProvider from "@/components/cart/CartProvider";
import CartDrawer from "@/components/cart/CartDrawer";
import WelcomePopup from "@/components/WelcomePopup";
import { getLocale } from "@/lib/i18n/server";
import { serverApiFetch } from "@/lib/server-api";

/**
 * Overrides the root layout's hard-coded title/description/OG image with
 * the admin-set ones (Cài đặt web > Tiêu đề/Mô tả website, Ảnh chia sẻ mạng
 * xã hội) when set. Lives here rather than the root layout because this
 * layout already reads cookies() (locale) and is dynamic regardless —
 * adding this fetch costs nothing extra here, but would have forced
 * /admin/* out of static rendering too if it were in the root layout, for
 * settings admin pages never use.
 *
 * The admin fields save correctly (server/routes/content.js) but nothing
 * ever read them back — the root layout's `metadata` export is a static
 * object, so the homepage (and every other page with no `metadata` of its
 * own) always showed that hard-coded fallback regardless of what was saved
 * (bug report: admin's SEO title/description never appeared on the live
 * site). A page that sets its own metadata (product, catalog, ...) is
 * unaffected — Next.js only falls back to a parent layout's title/
 * description when the page itself doesn't set one.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await serverApiFetch<{
      ogImageUrl?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
    }>("/api/content/site-settings");

    const meta: Metadata = {};
    if (settings.seoTitle) {
      meta.title = settings.seoTitle;
      meta.openGraph = { ...meta.openGraph, title: settings.seoTitle };
      meta.twitter = { ...meta.twitter, title: settings.seoTitle };
    }
    if (settings.seoDescription) {
      meta.description = settings.seoDescription;
      meta.openGraph = { ...meta.openGraph, description: settings.seoDescription };
      meta.twitter = { ...meta.twitter, description: settings.seoDescription };
    }
    if (settings.ogImageUrl) {
      meta.openGraph = { ...meta.openGraph, images: [settings.ogImageUrl] };
      meta.twitter = { ...meta.twitter, images: [settings.ogImageUrl] };
    }
    return meta;
  } catch {
    // Falls back to the root layout's defaults.
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
          {/* Here rather than on the homepage alone: the Announcement bar
              renders on every storefront page and its button reopens this
              dialog, so the listener has to exist on every one of them. */}
          <WelcomePopup />
        </CartProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
