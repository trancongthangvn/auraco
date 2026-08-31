import type { Metadata } from "next";
import { serverApiFetch } from "@/lib/server-api";
import {
  Bodoni_Moda,
  Cormorant_Garamond,
  Jost,
  Source_Sans_3,
} from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// The reference site's UI face: nav, prices, review quotes, the trust-band
// labels and every small caps-y label are Jost, not the body serif or the
// body sans. Without it those all fell back to Source Sans 3 and read wrong.
const jost = Jost({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Used by the reference for one thing only: the collection tile captions.
const bodoni = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const SITE_URL = "https://aura.maxmin.vn";
const SITE_TITLE = "AURA & CO | Premium Gold Vermeil & Sterling Silver Jewelry";
const SITE_DESCRIPTION =
  "Timeless gold and silver, understated luxury. Everyday minimalist jewelry.";

const DEFAULT_OG_IMAGE = "/images/brand/opengraph-image.png";

// generateMetadata (not a static `metadata` export) so the admin-set OG
// image (Cài đặt web > Ảnh chia sẻ mạng xã hội) can override the default —
// a plain fetch here doesn't opt this layout out of static rendering the
// way cookies() would (see the note on RootLayout below), so it's safe to
// do site-wide.
export async function generateMetadata(): Promise<Metadata> {
  let ogImage = DEFAULT_OG_IMAGE;
  try {
    const settings = await serverApiFetch<{ ogImageUrl?: string | null }>(
      "/api/content/site-settings"
    );
    if (settings.ogImageUrl) ogImage = settings.ogImageUrl;
  } catch {
    // Falls back to the default image — a settings-fetch failure shouldn't
    // break page metadata for every route on the site.
  }

  return {
    metadataBase: new URL(SITE_URL),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    openGraph: {
      type: "website",
      siteName: "AURA & CO",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [ogImage],
    },
  };
}

// Intentionally does NOT read cookies() here — that would force every route
// under this layout (including /admin, which is Vietnamese-only and doesn't
// use the dictionary at all) to opt out of static rendering. Locale is read
// one level down, in `app/(storefront)/layout.tsx`, which only wraps the
// customer-facing routes that actually need it.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${sourceSans.variable} ${jost.variable} ${bodoni.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#2b261f] font-sans">
        {children}
      </body>
    </html>
  );
}
