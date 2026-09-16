import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccountClient from "@/components/account/AccountClient";
import { getServerDictionary } from "@/lib/i18n/server";

export const metadata = {
  title: "My account | AETHER",
  // Per-customer screen: nothing here should be indexed.
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const { dict } = await getServerDictionary();
  return (
    <>
      <Announcement />
      <Header />
      <main>
        {/* Heading rendered by AccountClient (not the shared PageHero, which
            is narrower) so it lines up with the wider account content. */}
        <AccountClient title={dict.account.title} subtitle={dict.account.subtitle} />
      </main>
      <Footer />
    </>
  );
}
