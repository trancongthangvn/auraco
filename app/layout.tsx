import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Cormorant_Garamond } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Source Sans 3 covers body copy, nav/UI labels, and prices/product titles —
// matching the reference site's own font-family stack for those elements
// (which declares "Jost, sans-serif" but never actually loads Jost, so real
// visitors see their browser's generic sans-serif fallback; Source Sans 3 is
// the closest already-loaded face to that fallback's metrics, per
// DEPLOYMENT.md's "Jost is declared but never loaded" note).
const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Cormorant Garamond is the reference site's actual heading/logo face (h1,
// h2, the "AETHER" wordmark) — see globals.css's .font-serif-display.
// 400 is loaded even though nothing used to request it explicitly: several
// headings already carry Tailwind's `font-normal` (the news page's "Journal"
// title, PageHero's h1 on About/Contact/legal pages), and with 500 as the
// lightest face on offer the browser was synthesising 400 from it — which
// renders heavier than the design asks for. Loading the real 400 cut makes
// those headings resolve to an actual face instead of a faux-weight.
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const SITE_URL = "https://aetherpieces.com";
const SITE_TITLE = "AETHER | Premium Gold Vermeil & Sterling Silver Jewelry";
const SITE_DESCRIPTION =
  "Timeless gold and silver, understated luxury. Everyday minimalist jewelry.";

// The admin-set OG image (Cài đặt web > Ảnh chia sẻ mạng xã hội) is applied
// in app/(storefront)/layout.tsx's generateMetadata instead of here — that
// layout already reads cookies() (locale) and is dynamic regardless, while
// this root layout stays a static `metadata` export on purpose (see the
// note on RootLayout below) so /admin/* isn't forced dynamic just to fetch
// an image it never uses.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "AETHER",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: ["/images/brand/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/images/brand/opengraph-image.png"],
  },
};

// Pinch-to-zoom was left open (the reference's own viewport tag is
// identical — `width=device-width, initial-scale=1`, no scale cap either),
// but on mobile a fast horizontal swipe near the edge of the screen could
// get misread as the start of a pinch gesture and zoom the whole page out,
// which read as the layout "shifting"/showing more content than it should
// mid-swipe. Capping maximumScale to 1 and disabling userScalable stops
// that outright — a deliberate divergence from the reference here, per
// explicit request, not a measured-and-matched value.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Intentionally does NOT read cookies() here — that would force every route
// under this layout (including /admin, which is Vietnamese-only and doesn't
// use the dictionary at all) to opt out of static rendering. Locale is read
// one level down, in `app/(storefront)/layout.tsx`, which only wraps the
// customer-facing routes that actually need it.
// Google Tag Manager container. Lives in the root layout, so it covers every
// route on the site — storefront and /admin alike.
//
// `afterInteractive` rather than `beforeInteractive`: GTM's own snippet is
// written to run from a normal <script> in <head>, and loading it before
// hydration would block first paint for a tag manager that has nothing to do
// with rendering. The <noscript> iframe below is GTM's documented fallback and
// has to sit at the very top of <body>.
const GTM_ID = "GTM-KP2GZZ9J";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${cormorantGaramond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#2b261f] font-sans">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Script id="gtm-base" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
        {children}
      </body>
    </html>
  );
}
