import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThankYouClient from "@/components/checkout/ThankYouClient";

export const metadata = {
  title: "Thank you | AETHER",
  // A per-customer confirmation screen: nothing here should be indexed.
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <>
      <Announcement />
      <Header />
      <ThankYouClient />
      <Footer />
    </>
  );
}
