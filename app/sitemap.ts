import type { MetadataRoute } from "next";
import { products, collectionFilters } from "@/data/products";
import { journalPosts } from "@/data/site";

export const dynamic = "force-static";

const BASE_URL = "https://aura.maxmin.vn";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/catalog",
    "/cart",
    "/login",
    "/register",
    "/news",
    "/pages/about",
    "/pages/contact",
    "/pages/privacy-policy",
    "/pages/security-policy",
    "/pages/return-policy",
    "/pages/terms-of-service",
  ].map((path) => ({ url: `${BASE_URL}${path}` }));

  const collectionRoutes = collectionFilters
    .filter((c) => c.value !== "ALL")
    .map((c) => ({ url: `${BASE_URL}/catalog/${c.value}` }));

  const productRoutes = products.map((p) => ({
    url: `${BASE_URL}/product/${p.slug}`,
  }));

  const journalRoutes = journalPosts.map((p) => ({
    url: `${BASE_URL}/news/${p.slug}`,
  }));

  return [...staticRoutes, ...collectionRoutes, ...productRoutes, ...journalRoutes];
}
