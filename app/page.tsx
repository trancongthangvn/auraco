import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Collections from "@/components/Collections";
import ProductCarousel from "@/components/ProductCarousel";
import Testimonials from "@/components/Testimonials";
import TrustBadges from "@/components/TrustBadges";
import ITGirlEdit from "@/components/ITGirlEdit";
import Journal from "@/components/Journal";
import Footer from "@/components/Footer";
import { beachVibeProducts, newArrivalProducts } from "@/data/site";

export default function Home() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <Hero />
        <Collections />
        <ProductCarousel
          title="BEACH VIBE"
          subtitle="Sun-drenched styles for endless summer days. Discover lightweight pieces designed to catch the coastal light."
          products={beachVibeProducts}
        />
        <ProductCarousel title="NEW ARRIVALS" products={newArrivalProducts} />
        <Testimonials />
        <TrustBadges />
        <ITGirlEdit />
        <Journal />
      </main>
      <Footer />
    </>
  );
}
