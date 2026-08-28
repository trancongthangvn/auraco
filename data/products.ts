export type Category = "Necklaces" | "Bracelets" | "Earrings" | "Signature Sets";

export type ProductAttribute = { name: string; value: string };

export type FullProduct = {
  slug: string;
  name: string;
  category: Category;
  collections: string[];
  material: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  images: string[];
  description: string;
  features: string[];
  stock: number;
  /** Optional looping product video (MP4) shown in the homepage video carousel. */
  videoUrl?: string;
  attributes?: ProductAttribute[];
};

const img = {
  evermere1:
    "/images/products/variants/bd3b81ed-962e-4f82-8391-69052b5aefaf.webp",
  evermere2:
    "/images/products/variants/4b5a8c78-7c53-4cf9-b63a-22b0a5ce90ca.webp",
  evermereThumb:
    "/images/products/thumbnails/1fb8c789-ece5-4cdb-9022-0a20ee3a1261.webp",
};

export const products: FullProduct[] = [
  {
    slug: "Evermere-Heart-Necklace",
    name: "Evermere Heart Necklace",
    category: "Necklaces",
    collections: ["BEACH-VIBE", "BEST-SELLERS"],
    material: "18ct Gold Vermeil",
    price: 130,
    rating: 4.5,
    reviewCount: 4,
    images: [img.evermere1, img.evermere2, img.evermereThumb],
    description:
      "Designed to celebrate an everlasting bond of love, this romantic intertwining necklace brings a sense of heartfelt elegance into your everyday jewelry rotation. Wear it solo as a meaningful centerpiece or layer it with longer chains to build your signature neckline stack.\n\nThis is a cherished piece you'll reach for every single day. The Evermere Heart Necklace is inspired by endless devotion, featuring a harmonious fusion of the infinity loop and a delicate heart motif finished in flawless 18k gold.",
    features: [
      "A harmonious intertwining of the infinity symbol and heart motif for a deeply romantic touch",
      "Smooth, polished metallic curves designed to gracefully catch the light with every movement",
      "A meaningful statement pendant that pairs easily with any everyday neckline",
    ],
    stock: 9,
    attributes: [
      { name: "Material", value: "18ct Gold Vermeil over Sterling Silver" },
      { name: "Plating thickness", value: "2.5 micron" },
      { name: "Chain length", value: "16 in + 2 in extender" },
      { name: "Closure", value: "Lobster clasp" },
      { name: "Hypoallergenic", value: "Yes, nickel and lead free" },
      { name: "Water resistant", value: "Yes, avoid prolonged submersion" },
    ],
  },
  {
    slug: "Pure-Alhambra",
    name: "Pure Alhambra",
    category: "Necklaces",
    collections: ["BEACH-VIBE"],
    material: "18k Gold Vermeil, Mother of Pearl",
    price: 130,
    rating: 5,
    reviewCount: 1,
    images: [
      "/images/products/thumbnails/01937a3b-cd91-477a-a68f-ab079668d02c.webp",
    ],
    description:
      "A quiet-luxury classic reimagined: the clover motif in lustrous mother of pearl set in 18k gold vermeil, designed to be worn every day or layered for a fuller stack.",
    features: [
      "Iconic four-leaf clover silhouette in genuine mother of pearl",
      "18k gold vermeil setting resists tarnish with everyday wear",
      "Adjustable chain length for a versatile fit",
    ],
    stock: 14,
    attributes: [
      { name: "Material", value: "18k Gold Vermeil, Mother of Pearl" },
      { name: "Pendant size", value: "15mm clover motif" },
      { name: "Chain length", value: "17 in, adjustable to 15 in" },
      { name: "Closure", value: "Spring ring clasp" },
    ],
  },
  {
    slug: "Audrey-Diamond-Hoops",
    name: "Audrey Diamond Hoops",
    category: "Earrings",
    collections: ["BEACH-VIBE", "QUIET-LUXURY"],
    material: "18k Gold Vermeil, Cubic Zirconia",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/variants/822cc99c-8e65-45f6-bb68-9ea8962cefb3.webp",
    ],
    description:
      "Sculptural hoops finished with a row of pavé cubic zirconia for everyday sparkle that catches the light from every angle.",
    features: [
      "Hand-set cubic zirconia pavé",
      "Lightweight hollow construction for all-day comfort",
      "Secure hinged closure",
    ],
    stock: 20,
    attributes: [
      { name: "Material", value: "18k Gold Vermeil, Cubic Zirconia" },
      { name: "Hoop diameter", value: "20mm" },
      { name: "Closure", value: "Hinged snap-back" },
      { name: "Hypoallergenic", value: "Yes, nickel and lead free" },
    ],
  },
  {
    slug: "The-Radiant-Flow-Tennis-Bracelet",
    name: "The Radiant Flow Tennis Bracelet",
    category: "Bracelets",
    collections: ["BEACH-VIBE", "STATEMENT"],
    material: "Sterling Silver, Cubic Zirconia",
    price: 100,
    rating: 3.5,
    reviewCount: 2,
    images: [
      "/images/products/thumbnails/99c4a20e-a5e9-418d-a729-d13e457846f5.webp",
    ],
    description:
      "A continuous line of brilliant-cut cubic zirconia set in sterling silver, engineered for a fluid, comfortable drape on the wrist.",
    features: [
      "Continuous line-set cubic zirconia",
      "Rhodium-plated sterling silver for lasting shine",
      "Adjustable box clasp with safety catch",
    ],
    stock: 11,
  },
  {
    slug: "Layered-Opal-Necklace",
    name: "Layered Opal Necklace",
    category: "Necklaces",
    collections: ["BEACH-VIBE", "BEST-SELLERS"],
    material: "18k Gold Vermeil, Opal",
    price: 130,
    rating: 5,
    reviewCount: 5,
    images: [
      "/images/products/thumbnails/97fce6ae-f0bd-419d-a95d-97e5a0825815.webp",
    ],
    description:
      "Two delicate chains suspend a shimmering opal pendant, designed to be worn together for effortless dimension or separated across your daily stack.",
    features: [
      "Genuine opal pendant with natural color play",
      "Double-layer chain design, pre-styled to save you time",
      "18k gold vermeil over sterling silver base",
    ],
    stock: 7,
  },
  {
    slug: "Celeste-Pav%C3%A9-Hoops",
    name: "Celeste Pavé Hoops",
    category: "Earrings",
    collections: ["BEACH-VIBE", "TRENDING-NOW"],
    material: "18k Gold Vermeil, Cubic Zirconia",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/4ab16aa0-17a6-4bb9-bd7b-36b887fda492.webp",
    ],
    description:
      "Petite huggie hoops fully paved in cubic zirconia for a soft, constant sparkle that works from desk to dinner.",
    features: [
      "Full pavé cubic zirconia coverage",
      "Snug huggie fit close to the earlobe",
      "18k gold vermeil plating",
    ],
    stock: 16,
  },
  {
    slug: "Square-Pearl-Baya-Pendant-Necklace",
    name: "Square Pearl Baya Pendant Necklace",
    category: "Necklaces",
    collections: ["NEW-ARRIVALS", "BEST-SELLERS"],
    material: "18k Gold Vermeil, Pearl",
    price: 100,
    rating: 5,
    reviewCount: 5,
    images: [
      "/images/products/thumbnails/40c7b319-e147-4a6e-bd81-561396aff76d.webp",
    ],
    description:
      "A modern take on the classic pearl pendant, framed in a sculptural square setting for a piece that feels both timeless and current.",
    features: [
      "Genuine freshwater pearl centerpiece",
      "Sculptural square bezel setting",
      "18k gold vermeil chain and findings",
    ],
    stock: 12,
  },
  {
    slug: "The-Timeless-Green-Stone-Locket-Necklace",
    name: "The Timeless Green Stone Locket Necklace",
    category: "Necklaces",
    collections: ["NEW-ARRIVALS"],
    material: "18k Gold Vermeil, Green Onyx",
    price: 100,
    rating: 5,
    reviewCount: 5,
    images: [
      "/images/products/thumbnails/315fb859-2ccd-4bcb-9a3a-e038c1d344a0.webp",
    ],
    description:
      "A polished green onyx stone set in a locket-style frame, bringing a grounded pop of color to a minimalist gold chain.",
    features: [
      "Genuine green onyx stone",
      "Locket-inspired bezel setting",
      "Fine cable chain in 18k gold vermeil",
    ],
    stock: 10,
  },
  {
    slug: "The-Emerald-Tide-Station-Bracelet",
    name: "The Emerald Tide Station Bracelet",
    category: "Bracelets",
    collections: ["NEW-ARRIVALS"],
    material: "18k Gold Vermeil, Emerald",
    price: 130,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/1b26c5c9-612d-4ee9-91d9-f04477e03206.webp",
    ],
    description:
      "Emerald-hued stones stationed along a fine gold chain for a wash of color that layers beautifully with metal-only pieces.",
    features: [
      "Station-set faceted stones",
      "Adjustable extender chain",
      "18k gold vermeil finish",
    ],
    stock: 13,
  },
  {
    slug: "The-Solstice-Pyramid-Stone-Hoops",
    name: "The Solstice Pyramid Stone Hoops",
    category: "Earrings",
    collections: ["NEW-ARRIVALS", "MINIMALIST"],
    material: "18k Gold Vermeil, Cubic Zirconia",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/1bd7f070-d6ec-45c5-b38f-5fecb8bdf720.webp",
    ],
    description:
      "Geometric pyramid-cut stones set along a sleek hoop silhouette for a sculptural, architectural finish.",
    features: [
      "Pyramid-cut cubic zirconia stones",
      "Lightweight sleek hoop band",
      "Secure post-and-hinge back",
    ],
    stock: 15,
  },
  {
    slug: "Heritage-Triple-Ridge-Huggies",
    name: "Heritage Triple Ridge Huggies",
    category: "Earrings",
    collections: ["NEW-ARRIVALS", "MINIMALIST"],
    material: "18k Gold Vermeil",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/9a4dd914-84d1-4f4e-8bd5-dee639858232.webp",
    ],
    description:
      "Textured ridge detailing wraps this huggie hoop for tactile dimension without any added stones.",
    features: [
      "Triple ridge textured detailing",
      "Close-to-lobe huggie fit",
      "Solid 18k gold vermeil construction",
    ],
    stock: 18,
  },
  {
    slug: "Dot-Chain-Necklace",
    name: "Dot Chain Necklace",
    category: "Necklaces",
    collections: ["NEW-ARRIVALS", "BEST-SELLERS"],
    material: "Sterling Silver",
    price: 100,
    rating: 5,
    reviewCount: 5,
    images: [
      "/images/products/thumbnails/4bdc27f4-f778-4cdd-ba40-b69666f9ebea.webp",
    ],
    description:
      "A dainty beaded dot chain in polished sterling silver, the effortless everyday layer that pairs with anything.",
    features: [
      "Delicate beaded dot-chain design",
      "Polished sterling silver",
      "Lobster clasp with 2in extender",
    ],
    stock: 22,
  },
  {
    slug: "Everly-Knot-Bracelet",
    name: "Everly Knot Bracelet",
    category: "Bracelets",
    collections: ["QUIET-LUXURY"],
    material: "18k Gold Vermeil, Cubic Zirconia",
    price: 130,
    rating: 5,
    reviewCount: 1,
    images: [
      "/images/products/thumbnails/2d77357a-1dd5-497f-bad9-f7ab3a705160.webp",
    ],
    description:
      "A sculptural knot motif finished with a hint of sparkle, designed as a refined centerpiece for any wrist stack.",
    features: [
      "Sculptural knot centerpiece",
      "Cubic zirconia accent stones",
      "Adjustable chain fit",
    ],
    stock: 9,
  },
  {
    slug: "Nautilus-Flow-Statement-Bracelet",
    name: "Nautilus Flow Statement Bracelet",
    category: "Bracelets",
    collections: ["TRENDING-NOW"],
    material: "18k Gold Vermeil",
    price: 100,
    compareAtPrice: 130,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/29aa2f37-f00a-4c54-acb1-68756d52bca8.webp",
    ],
    description:
      "Organic flowing lines inspired by nautilus shell curves, cast in solid gold vermeil for a bold everyday statement.",
    features: [
      "Sculptural flowing organic silhouette",
      "Solid cast 18k gold vermeil",
      "Hidden box clasp closure",
    ],
    stock: 8,
  },
  {
    slug: "Sleek-Open-Cuff-Bangle-Bracelet",
    name: "Sleek Open-Cuff Bangle Bracelet",
    category: "Bracelets",
    collections: ["TRENDING-NOW"],
    material: "18k Gold Vermeil",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/5d968490-ef8c-4947-815a-454fc1e7cf12.webp",
    ],
    description:
      "A minimalist open cuff with a smooth polished finish, easy to slide on and stack with beaded bracelets.",
    features: [
      "Adjustable open-cuff design",
      "High-polish smooth finish",
      "Solid 18k gold vermeil",
    ],
    stock: 17,
  },
  {
    slug: "The-Aurelia-Earrings",
    name: "The Aurelia Earrings",
    category: "Earrings",
    collections: ["QUIET-LUXURY"],
    material: "18k Gold Vermeil",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/variants/59a639d5-c3c8-4017-8f99-74e8892c5c74.webp",
    ],
    description:
      "Sculpted drop earrings with a soft curved silhouette, designed to catch the light with subtle movement.",
    features: [
      "Sculpted curved drop silhouette",
      "Lightweight everyday wear",
      "18k gold vermeil finish",
    ],
    stock: 12,
  },
  {
    slug: "The-Madison-Hoops",
    name: "The Madison Hoops",
    category: "Earrings",
    collections: ["QUIET-LUXURY"],
    material: "18k Gold Vermeil",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/bfc1fdee-7f68-4e3c-9a32-1e702a1997ad.webp",
    ],
    description:
      "Classic medium-size hoops with a high-polish finish, the versatile everyday hoop that never goes out of style.",
    features: [
      "Classic medium hoop silhouette",
      "High-polish mirror finish",
      "Secure click-top closure",
    ],
    stock: 19,
  },
  {
    slug: "The-Heritage-Rose-Tennis-Bracelet",
    name: "The Heritage Rose Tennis Bracelet",
    category: "Bracelets",
    collections: ["QUIET-LUXURY"],
    material: "18k Rose Gold Vermeil, Cubic Zirconia",
    price: 130,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/0c3b4a9e-e0e2-44f2-a317-a41b13b466a1.webp",
    ],
    description:
      "A classic tennis bracelet in warm rose gold vermeil, lined with brilliant-cut cubic zirconia for timeless sparkle.",
    features: [
      "Continuous line-set cubic zirconia",
      "Warm 18k rose gold vermeil plating",
      "Box clasp with figure-eight safety",
    ],
    stock: 6,
  },
  {
    slug: "Chic-Statement-Chain",
    name: "Chic Statement Chain",
    category: "Signature Sets",
    collections: ["TRENDING-NOW"],
    material: "18k Gold Vermeil",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/c32cc10f-dac0-4713-bc12-03a92da51f09.webp",
    ],
    description:
      "A bold curb-link chain designed to be worn solo as a statement or stacked as the foundation of a layered look.",
    features: [
      "Bold curb-link chain design",
      "Solid 18k gold vermeil",
      "Lobster clasp with extender",
    ],
    stock: 10,
  },
  {
    slug: "Luxe-Clover",
    name: "Luxe Clover",
    category: "Signature Sets",
    collections: ["TRENDING-NOW"],
    material: "18k Gold Vermeil, Cubic Zirconia",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/07a5584a-621c-4d67-9e7a-e2a9fb013de8.webp",
    ],
    description:
      "A matching necklace and earring set featuring the signature clover motif, ready to wear straight out of the box.",
    features: [
      "Matching necklace + earrings set",
      "Signature clover motif throughout",
      "18k gold vermeil with cubic zirconia accents",
    ],
    stock: 8,
  },
  {
    slug: "Modern-Minimalist-Heart",
    name: "Modern Minimalist & Heart",
    category: "Signature Sets",
    collections: ["TRENDING-NOW"],
    material: "18k Gold Vermeil",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/06c5fd3b-7a0a-4ea7-8cff-5b3fe3adac6b.webp",
    ],
    description:
      "A pared-back heart pendant paired with matching studs, designed for the minimalist who still wants a touch of romance.",
    features: [
      "Matching pendant + stud set",
      "Clean minimalist heart silhouette",
      "18k gold vermeil finish",
    ],
    stock: 11,
  },
  {
    slug: "Timeless-Elegance-Sparkle",
    name: "Timeless Elegance & Sparkle",
    category: "Signature Sets",
    collections: ["TRENDING-NOW"],
    material: "18k Gold Vermeil, Cubic Zirconia",
    price: 100,
    rating: 0,
    reviewCount: 0,
    images: [
      "/images/products/thumbnails/2290a561-7879-45f6-aefa-8265ba21ba02.webp",
    ],
    description:
      "A coordinated set of pavé pieces designed to be worn together for a polished, put-together sparkle from morning to night.",
    features: [
      "Coordinated multi-piece set",
      "Pavé cubic zirconia detailing",
      "18k gold vermeil finish",
    ],
    stock: 7,
  },
];

export function getProductBySlug(slug: string) {
  return products.find(
    (p) => p.slug.toLowerCase() === decodeURIComponent(slug).toLowerCase()
  );
}

export function getRelatedProducts(product: FullProduct, count = 8) {
  return products
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .slice(0, count)
    .concat(
      products.filter((p) => p.slug !== product.slug && p.category !== product.category)
    )
    .slice(0, count);
}

export const categories: Category[] = [
  "Necklaces",
  "Bracelets",
  "Earrings",
  "Signature Sets",
];

export const collectionFilters = [
  { label: "All products", value: "ALL" },
  { label: "Quiet Luxury", value: "QUIET-LUXURY" },
  { label: "Minimalist", value: "MINIMALIST" },
  { label: "Statement", value: "STATEMENT" },
  { label: "Trending Now", value: "TRENDING-NOW" },
  { label: "Beach Vibe", value: "BEACH-VIBE" },
  { label: "New Arrivals", value: "NEW-ARRIVALS" },
  { label: "Best Sellers", value: "BEST-SELLERS" },
];
