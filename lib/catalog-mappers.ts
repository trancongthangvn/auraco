// Shared helpers for mapping raw API rows (snake_case, string-ified NUMERIC
// columns) onto the storefront's existing FullProduct / collection-filter
// shapes, used by the catalog listing pages.
import type { FullProduct, Category } from "@/data/products";

export type ApiProduct = {
  id: number;
  slug: string;
  name: string;
  category: string;
  material: string;
  price: string;
  compare_at_price: string | null;
  rating: string;
  review_count: number;
  images: string[];
  description: string;
  features: string[];
  stock: number;
  active: boolean;
  /** Optional looping product video (MP4). Null/absent for most products. */
  video_url?: string | null;
  attributes?: { name: string; value: string }[];
  collections?: string[];
  /** Real per-product "Details & Fit" + "How To Style It" HTML, scraped/
   * paraphrased from the reference site. Null for any product that wasn't
   * successfully imported — the product page falls back to the generic
   * attributes/material text in that case. */
  details_html?: string | null;
};

export type ApiCollection = {
  id: number;
  slug: string;
  name: string;
  image_url: string | null;
  href: string | null;
  sort_order: number;
  active: boolean;
};

export function toFullProduct(api: ApiProduct): FullProduct {
  return {
    slug: api.slug,
    name: api.name,
    category: api.category as Category,
    collections: api.collections || [],
    material: api.material,
    price: Number(api.price),
    compareAtPrice:
      api.compare_at_price != null ? Number(api.compare_at_price) : undefined,
    rating: Number(api.rating),
    reviewCount: api.review_count,
    images: api.images,
    description: api.description,
    features: api.features,
    stock: api.stock,
    videoUrl: api.video_url ?? undefined,
    attributes: api.attributes,
    detailsHtml: api.details_html ?? undefined,
  };
}

export function toCollectionFilters(collections: ApiCollection[]) {
  return [
    { label: "All products", value: "ALL" },
    ...collections.map((c) => ({ label: c.name, value: c.slug })),
  ];
}
