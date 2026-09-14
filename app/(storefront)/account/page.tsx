import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import AccountClient from "@/components/account/AccountClient";
import { getServerDictionary } from "@/lib/i18n/server";

export const metadata = {
  title: "My account | AURA & CO",
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
        <PageHero title={dict.account.title} subtitle={dict.account.subtitle} />
        <AccountClient />
      </main>
      <Footer />
    </>
  );
}
