import Link from "next/link";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Cart | AURA & CO" };

export default function CartPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main className="mx-auto max-w-[900px] px-6 py-24 text-center">
        <h1 className="font-serif-display text-3xl mb-4">Your Bag</h1>
        <p className="text-black/60 mb-8">
          Your bag is currently empty. Explore the collection and add your
          favorite pieces.
        </p>
        <Link
          href="/catalog"
          className="inline-block border border-[#2b261f] px-8 py-3 text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors"
        >
          CONTINUE SHOPPING
        </Link>
      </main>
      <Footer />
    </>
  );
}
