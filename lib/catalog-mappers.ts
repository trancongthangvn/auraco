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
  /** Always-visible one-line tagline shown directly under the product name —
   *  distinct from `description`, which only ever renders inside the
   *  collapsed "Why You'll Love It" accordion. Null/absent hides the line. */
  short_description?: string | null;
  description: string;
  /** Ordered {title, content} pairs, each its own accordion row on the
   *  product page, ahead of the fixed Details/Delivery & Returns rows.
   *  Empty/absent falls back to the single `description` above, rendered
   *  as one "Why You'll Love It" row (pre-existing behaviour, unchanged). */
  description_sections?: { title: string; content: string }[];
  features: string[];
  stock: number;
  active: boolean;
  /** Optional looping product video (MP4). Null/absent for most products.
   *  Always kept as video_urls[0] by the API on every write — read
   *  video_urls when you need the FULL list; this stays untouched
   *  specifically so the homepage's "has a video" filter/VideoCarousel
   *  keep working unchanged, seeing exactly the first video. */
  video_url?: string | null;
  /** Ordered list of every video attached to this product (see migration
   *  018). Absent/empty on older rows that predate it — falls back to
   *  `video_url` as a single-item list. */
  video_urls?: string[];
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
  /** Dedicated nav mega-menu thumbnail (reference's `/thumbnails/*`) —
   *  distinct lifestyle shot from the catalog's own `images[0]`. Null for
   *  the few products the reference itself never generated one for. */
  thumbnail_url?: string | null;
};

export type ApiCollection = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  /** Catalog page's own hero banner (a distinct lifestyle photo) — separate
   *  from `image_url`, which is the homepage tile's still-life shot. */
  banner_url: string | null;
  href: string | null;
  sort_order: number;
  active: boolean;
};

export type ApiBrand = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
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
    shortDescription: api.short_description ?? undefined,
    description: api.description,
    descriptionSections: api.description_sections ?? [],
    features: api.features,
    stock: api.stock,
    videoUrl: api.video_url ?? undefined,
    videoUrls:
      api.video_urls && api.video_urls.length > 0
        ? api.video_urls
        : api.video_url
          ? [api.video_url]
          : [],
    attributes: api.attributes,
    detailsHtml: api.details_html ?? undefined,
    variants: (api.variants || []).map(toProductVariant),
    thumbnailUrl: api.thumbnail_url ?? undefined,
    badgeLabel: api.badge_label ?? undefined,
  };
}

export function toCollectionFilters(collections: ApiCollection[]) {
  return [
    { label: "All products", value: "ALL" },
    ...collections.map((c) => ({ label: c.name, value: c.slug })),
  ];
}
