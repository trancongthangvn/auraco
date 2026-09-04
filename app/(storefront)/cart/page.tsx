import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartClient from "@/components/cart/CartClient";
import { getServerDictionary } from "@/lib/i18n/server";
import { serverApiFetch } from "@/lib/server-api";
import type { ApiProduct } from "@/lib/catalog-mappers";
import type { Product as CarouselProduct } from "@/data/site";

export const metadata = { title: "Cart | AURA & CO" };

function toCarouselProducts(list: ApiProduct[]): CarouselProduct[] {
  // Every product in the Best Sellers collection, unsliced — explicit
  // request: the static grid display should show all of them, not a capped
  // preview.
  return list.map((p) => ({
    name: p.name,
    href: `/product/${p.slug}`,
    material: p.material,
    price: `$${Number(p.price).toFixed(2)} USD`,
    priceValue: Number(p.price),
    rating: Math.round(Number(p.rating)),
    img: p.images[0],
    hoverImg: p.images[1],
    badgeLabel: p.badge_label ?? undefined,
  }));
}

export default async function CartPage() {
  const [{ dict }, bestSellersApi] = await Promise.all([
    getServerDictionary(),
    serverApiFetch<ApiProduct[]>("/api/products?collection=BEST-SELLERS").catch(
      () => [] as ApiProduct[]
    ),
  ]);
  const bestSellers = toCarouselProducts(bestSellersApi);

  return (
    <>
      <Announcement />
      <Header />
      <CartClient
        title={dict.cart.title}
        emptyText={dict.cart.empty}
        continueText={dict.common.continueShopping}
        bestSellers={bestSellers}
      />
      <Footer />
    </>
  );
}
