import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartClient from "@/components/cart/CartClient";
import { getServerDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Cart | AURA & CO" };

export default async function CartPage() {
  const { dict } = await getServerDictionary();
  return (
    <>
      <Announcement />
      <Header />
      <CartClient
        title={dict.cart.title}
        emptyText={dict.cart.empty}
        continueText={dict.common.continueShopping}
      />
      <Footer />
    </>
  );
}
