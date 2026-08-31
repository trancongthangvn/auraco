// Shared helpers for mapping raw API rows (snake_case, string-ified NUMERIC
// columns) onto the storefront's existing FullProduct / collection-filter
// shapes, used by the catalog listing pages.
import type { FullProduct, Category, ProductVariant } from "@/data/products";

export type ApiProductVariant = {
  id: number;
  product_id: number;
  color_name: string;
  color_swatch: string | null;
  size: string | null;
  price: string | number;
  compare_at_price: string | number | null;
  stock: number;
  sku: string | null;
  front_image: string | null;
  hover_images: string[] | null;
  is_default: boolean;
  active: boolean;
  sort_order: number;
};

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
  /** Only present on the single-product endpoint (GET /api/products/:slug);
   *  absent on list endpoints. Already filtered to active=true by the API. */
  variants?: ApiProductVariant[];
  /** Small card badge ("New In", "Hot"...) — null/absent hides it. */
  badge_label?: string | null;
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

export function toProductVariant(v: ApiProductVariant): ProductVariant {
  return {
    id: v.id,
    productId: v.product_id,
    colorName: v.color_name,
    colorSwatch: v.color_swatch,
    size: v.size,
    price: Number(v.price),
    compareAtPrice:
      v.compare_at_price != null ? Number(v.compare_at_price) : undefined,
    stock: v.stock,
    sku: v.sku,
    frontImage: v.front_image,
    hoverImages: v.hover_images || [],
    isDefault: v.is_default,
    sortOrder: v.sort_order,
  };
}

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
    variants: (api.variants || []).map(toProductVariant),
  };
}

export function toCollectionFilters(collections: ApiCollection[]) {
  return [
    { label: "All products", value: "ALL" },
    ...collections.map((c) => ({ label: c.name, value: c.slug })),
  ];
}
