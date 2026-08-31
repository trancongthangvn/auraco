import Link from "next/link";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LanguageProvider from "@/components/i18n/LanguageProvider";
import CurrencyProvider from "@/components/currency/CurrencyProvider";
import CartProvider from "@/components/cart/CartProvider";

// Rendered for any URL that matches no route at all, so it sits outside the
// `(storefront)` route group's layout (and its cookie-driven locale) — wrap
// with a self-contained default-locale provider so Header/Footer still work.
export default function NotFound() {
  return (
    <LanguageProvider locale="en">
      <CurrencyProvider>
        <CartProvider>
          <Announcement />
          <Header />
          <main>
            <div className="mx-auto max-w-[600px] px-6 py-24 text-center">
              <h1 className="font-serif-display text-5xl mb-4">Page not found</h1>
              <p className="text-sm text-black/60 mb-10">
                The page you requested does not exist.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/"
                  className="border border-[#2b261f] px-6 py-3 text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors"
                >
                  Return home
                </Link>
                <Link
                  href="/catalog"
                  className="border border-[#2b261f] px-6 py-3 text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors"
                >
                  Browse catalog
                </Link>
              </div>
            </div>
          </main>
          <Footer />
        </CartProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
