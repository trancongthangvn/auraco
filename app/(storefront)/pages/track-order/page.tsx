import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import OrderLookupForm from "@/components/OrderLookupForm";

export const metadata = {
  title: "Track Your Order | AURA & CO",
  description:
    "Look up your AURA & CO order by order code and email to check its status.",
};

export default function TrackOrderPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero
          title="Track Your Order"
          subtitle="Enter your order code and email to see its current status."
        />
        <OrderLookupForm />
      </main>
      <Footer />
    </>
  );
}
