export const heroSlides = [
  {
    label: "TRENDING NOW",
    title: "HARNESS HIGH-FREQUENCY ENERGY. MANIFEST PROSPERITY.",
    href: "/catalog/TRENDING-NOW",
    img: "/images/settings/banner-slides/c950bcae-d034-4c14-acc1-7398e4768966.webp",
  },
  {
    label: "BEACH VIBE",
    title: "TIMELESS GOLD AND SILVER. UNDERSTATED LUXURY.",
    href: "/catalog/BEACH-VIBE",
    img: "/images/settings/banner-slides/fbdd39e1-7f29-4a4f-9ace-620a90d3b392.webp",
  },
  {
    label: "NEW ARRIVALS",
    title: "EFFORTLESS GOLD AND SILVER. EVERYDAY MINIMALIST STYLE.",
    href: "/catalog/NEW-ARRIVALS",
    img: "/images/settings/banner-slides/a11d91e2-35fe-4d01-8734-bf22cce547dc.webp",
  },
];

export const navLinks = [
  { key: "necklaces" as const, label: "Necklaces", href: "/catalog?brand=Necklaces" },
  { key: "bracelets" as const, label: "Bracelets", href: "/catalog?brand=Bracelets" },
  { key: "earrings" as const, label: "Earrings", href: "/catalog?brand=Earrings" },
  { key: "signatureSets" as const, label: "Signature Sets", href: "/catalog?brand=Signature-Sets" },
  { key: "collections" as const, label: "Collections", href: "/catalog" },
  { key: "bestSellers" as const, label: "Best Sellers", href: "/catalog/BEST-SELLERS" },
];

export const ourStoryLinks = [
  { key: "news" as const, label: "News", href: "/news" },
  { key: "about" as const, label: "About", href: "/pages/about" },
  { key: "contact" as const, label: "Contact", href: "/pages/contact" },
];

export const collections = [
  {
    name: "QUIET LUXURY",
    href: "/catalog/QUIET-LUXURY",
    img: "/images/categories/0252ce6c-e81a-411b-a900-0fa53d2c6853.webp",
  },
  {
    name: "MINIMALIST",
    href: "/catalog/MINIMALIST",
    img: "/images/categories/c6549a06-5d56-4623-a5a6-8d97426fad97.webp",
  },
  {
    name: "STATEMENT",
    href: "/catalog/STATEMENT",
    img: "/images/categories/b6a65600-7a6c-47de-b2c0-01ee293d3d90.webp",
  },
  {
    name: "TRENDING NOW",
    href: "/catalog/TRENDING-NOW",
    img: "/images/categories/b0c45f9f-9292-4d2d-992a-03cb88818199.webp",
  },
  {
    name: "BEACH VIBE",
    href: "/catalog/BEACH-VIBE",
    img: "/images/categories/e64da900-489a-4701-b0c3-aaf1d7d7e590.webp",
  },
  {
    // Measured off auracojewelry.com: Best Sellers lives inside this
    // Collections accordion, not as its own top-level nav mega-menu (see
    // Header.tsx's `megaCategories` comment). Its href used to be the dead
    // "/product" route, which made Header.tsx's collectionSlug() resolve to
    // "product" and the product fetch silently return nothing.
    name: "BEST SELLERS",
    href: "/catalog/BEST-SELLERS",
    img: "/images/categories/bcdc23ff-1f19-44e0-be10-06d1aaedbe20.webp",
  },
];

export type Product = {
  name: string;
  href: string;
  material: string;
  price: string;
  /** Raw USD amount behind `price`, when the caller has one — ProductCarousel
   *  reformats from this with the visitor's chosen currency symbol when
   *  present, falling back to the pre-formatted `price` string otherwise
   *  (the static demo entries below have no live currency to react to). */
  priceValue?: number;
  rating: number;
  img: string;
  /** Second gallery image, shown on hover as the on-model shot. */
  hoverImg?: string;
  /** Admin-set card badge (products.badge_label), e.g. "New In", "Hot" —
   *  shown as a small pill top-left of the image. Undefined hides it. */
  badgeLabel?: string;
};

export const beachVibeProducts: Product[] = [
  {
    name: "Pure Alhambra",
    href: "/product/Pure-Alhambra",
    material: "18k Gold Vermeil, Mother of Pearl",
    price: "$130.00 USD",
    rating: 1,
    img: "/images/products/thumbnails/01937a3b-cd91-477a-a68f-ab079668d02c.webp",
  },
  {
    name: "Evermere Heart Necklace",
    href: "/product/Evermere-Heart-Necklace",
    material: "18ct Gold Vermeil",
    price: "$130.00 USD",
    rating: 4,
    img: "/images/products/thumbnails/1fb8c789-ece5-4cdb-9022-0a20ee3a1261.webp",
  },
  {
    name: "Audrey Diamond Hoops",
    href: "/product/Audrey-Diamond-Hoops",
    material: "18k Gold Vermeil, Cubic Zirconia",
    price: "$100.00 USD",
    rating: 0,
    img: "/images/products/variants/822cc99c-8e65-45f6-bb68-9ea8962cefb3.webp",
  },
  {
    name: "The Radiant Flow Tennis Bracelet",
    href: "/product/The-Radiant-Flow-Tennis-Bracelet",
    material: "Sterling Silver, Cubic Zirconia",
    price: "$100.00 USD",
    rating: 2,
    img: "/images/products/thumbnails/99c4a20e-a5e9-418d-a729-d13e457846f5.webp",
  },
  {
    name: "Layered Opal Necklace",
    href: "/product/Layered-Opal-Necklace",
    material: "18k Gold Vermeil, Opal",
    price: "$130.00 USD",
    rating: 5,
    img: "/images/products/thumbnails/97fce6ae-f0bd-419d-a95d-97e5a0825815.webp",
  },
  {
    name: "Celeste Pavé Hoops",
    href: "/product/Celeste-Pav%C3%A9-Hoops",
    material: "18k Gold Vermeil, Cubic Zirconia",
    price: "$100.00 USD",
    rating: 0,
    img: "/images/products/thumbnails/4ab16aa0-17a6-4bb9-bd7b-36b887fda492.webp",
  },
];

export const newArrivalProducts: Product[] = [
  {
    name: "Square Pearl Baya Pendant Necklace",
    href: "/product/Square-Pearl-Baya-Pendant-Necklace",
    material: "18k Gold Vermeil, Pearl",
    price: "$100.00 USD",
    rating: 0,
    img: "/images/products/thumbnails/40c7b319-e147-4a6e-bd81-561396aff76d.webp",
  },
  {
    name: "The Timeless Green Stone Locket Necklace",
    href: "/product/The-Timeless-Green-Stone-Locket-Necklace",
    material: "18k Gold Vermeil, Green Stone",
    price: "$100.00 USD",
    rating: 0,
    img: "/images/products/thumbnails/315fb859-2ccd-4bcb-9a3a-e038c1d344a0.webp",
  },
  {
    name: "The Emerald Tide Station Bracelet",
    href: "/product/The-Emerald-Tide-Station-Bracelet",
    material: "18k Gold Vermeil, Emerald",
    price: "$130.00 USD",
    rating: 0,
    img: "/images/products/thumbnails/1b26c5c9-612d-4ee9-91d9-f04477e03206.webp",
  },
  {
    name: "The Solstice Pyramid Stone Hoops",
    href: "/product/The-Solstice-Pyramid-Stone-Hoops",
    material: "18k Gold Vermeil, Cubic Zirconia",
    price: "$100.00 USD",
    rating: 0,
    img: "/images/products/thumbnails/1bd7f070-d6ec-45c5-b38f-5fecb8bdf720.webp",
  },
  {
    name: "Heritage Triple Ridge Huggies",
    href: "/product/Heritage-Triple-Ridge-Huggies",
    material: "18k Gold Vermeil",
    price: "$100.00 USD",
    rating: 0,
    img: "/images/products/thumbnails/9a4dd914-84d1-4f4e-8bd5-dee639858232.webp",
  },
  {
    name: "Dot Chain Necklace",
    href: "/product/Dot-Chain-Necklace",
    material: "Sterling Silver",
    price: "$100.00 USD",
    rating: 0,
    img: "/images/products/thumbnails/4bdc27f4-f778-4cdd-ba40-b69666f9ebea.webp",
  },
];

export const testimonials = [
  {
    initials: "MA",
    name: "Mairia",
    date: "08/09/2026",
    quote:
      "Really pretty and delicate, I love how it looks on my wrist. The chain is a little thinner than I expected, but overall I’m very happy with it.",
    photo: "/images/products/imported/09cc71d8476343cca31538ff35842330.webp",
  },
  {
    initials: "DM",
    name: "Denise Myers",
    date: "08/05/2026",
    quote:
      "Love the mixed gold tones. It goes with everything. I just wish the chain was a little longer.",
    photo: "/images/products/imported/502c9cd87d1848849d03e79dbaecfe82.webp",
  },
  {
    initials: "ME",
    name: "Maria Evans",
    date: "08/04/2026",
    quote:
      "Really impressed with the quality. The stones catch the light beautifully and look so elegant",
    photo: "/images/products/imported/bd4c07cbdf55464f93499767a3e9905e.webp",
  },
  {
    initials: "HO",
    name: "Hope",
    date: "08/04/2026",
    quote:
      "Obsessed with this! Fits great, looks super high quality, and arrived faster than expected.",
    photo: "/images/products/imported/b80b434ec6cc425d995b2ecc8767c97c.webp",
  },
  {
    initials: "KM",
    name: "Kimberly Martin",
    date: "08/01/2026",
    quote:
      "Love this layered necklace. It makes even a simple outfit look so put together.",
    photo: "/images/products/imported/35115fb1c6f64907a2c1bcf3597d0cce.webp",
  },
  {
    initials: "SR",
    name: "Sarah Rodriguez",
    date: "07/29/2026",
    quote:
      "Really impressed with the quality. The chain feels delicate but secure and the pendant has such a pretty sparkle.",
    photo: "/images/products/imported/2103924f79864c16964d7bb16327ca81.webp",
  },
];

export const trustBadges = [
  "2 YEAR WARRANTY",
  "FREE DELIVERY $120+",
  "30-DAY RETURNS",
];

export const journalPosts = [
  {
    slug: "it-girl-guide-styling-gold-silver-jewelry",
    date: "Dec 11, 2025",
    title:
      "Styling Gold & Silver: The Ultimate IT-Girl Guide to Necklaces, Bracelets & Earrings",
    excerpt:
      "Discover how to mix and layer gold and silver necklaces, bracelets, and earrings. Learn the art of balancing high-shine metals and statement pieces for an effortless, modern stack.",
    img: "/images/posts/92815f94-0f76-4b00-b587-dee1d32aebbb.png",
    body: [
      "Mixing metals used to be a styling taboo. Not anymore. The modern jewelry stack is built on contrast: warm 18k gold vermeil paired with cool sterling silver, worn together without apology.",
      "Start with your necklaces. Layer a short choker-length chain closest to the neck, a mid-length pendant piece in the middle, and a longer chain as your anchor layer. Keep at least one piece in each metal tone so the eye has somewhere to land.",
      "For bracelets, the same rule applies but on a smaller scale. A slim bangle, a beaded chain, and one statement cuff is usually enough. More than four pieces starts to look cluttered rather than curated.",
      "Earrings are where you can have the most fun. A mismatched pair, one gold hoop and one silver stud, reads as intentional when the rest of your stack is balanced. If in doubt, keep your earrings simple and let your necklace layers carry the statement.",
      "The golden rule of any mixed-metal stack: repeat each tone at least twice across your look. One gold piece on its own can look like an accident. Two gold pieces, deliberately placed, look like a decision.",
    ],
  },
  {
    slug: "it-girl-guide-gold-silver-jewelry-protection-energy",
    date: "Dec 11, 2025",
    title:
      "The IT-Girl Guide to Gold & Silver Jewelry: Protection, Energy & Everyday Stacks",
    excerpt:
      "Precious gold and silver metals combined with mindful stones have long been worn for abundance and modern protection. Here is your chic guide to styling, layering, and caring for your daily stack.",
    img: "/images/posts/4eb6771c-4c27-4fcd-b6a7-0a2f9be11b90.jpeg",
    body: [
      "Gold and silver have been worn as everyday armor for centuries, long before they were simply an accessory. Today that same instinct shows up as the pieces we reach for without thinking: the necklace we never take off, the hoops we default to every morning.",
      "Building a daily stack starts with your foundation pieces, the ones that stay on through the shower, the gym, and the nights out. Choose tarnish-resistant 18k gold vermeil or solid sterling silver for anything you plan to wear continuously.",
      "From there, layer in seasonal or occasion pieces: a pendant that matches your mood, a cuff you save for evenings. The foundation stays constant while the rest of your stack can change with you.",
      "Caring for your everyday pieces is simple: keep them away from perfume and lotion, store them flat rather than tangled together, and give them a gentle wipe with a soft cloth after wear to keep the shine consistent.",
    ],
  },
  {
    slug: "the-it-girl-ritual-cleanse-charge-sterling-silver",
    date: "Dec 17, 2025",
    title: "The IT-Girl Ritual: How to Cleanse & Charge Your Sterling Silver",
    excerpt:
      "Sunlight, moonlight, sound, and gentle care are simple rituals to refresh your gold, silver, and gemstone pieces between wears.",
    img: "/images/posts/dc8e9ad8-ec1e-42c1-9d1d-a7eb2a8e3c06.png",
    body: [
      "A quick refresh ritual keeps your everyday pieces looking their best and gives you a moment to reset before you put them back on. Think of it as maintenance for your jewelry box, not just your metal.",
      "Start with a soft, lint-free cloth and gently buff each piece to lift any surface residue from the day. Avoid anything abrasive, a soft polishing cloth is enough for both gold vermeil and sterling silver.",
      "For pieces with gemstones, a quick rinse in lukewarm water followed by an immediate pat-dry is usually safe, but always check the stone type first since some softer stones prefer a dry cloth only.",
      "Store your pieces flat and separated, tangled chains are the single biggest cause of scratches and snapped links. A lined jewelry tray or individual pouches will keep your stack ready to wear the next morning.",
    ],
  },
];

export const footerLinks = {
  shop: [
    { key: "catalog" as const, label: "Catalog", href: "/catalog" },
    { key: "cart" as const, label: "Cart", href: "/cart" },
  ],
  policies: [
    { key: "securityPolicy" as const, label: "Security Policy", href: "/pages/security-policy" },
    { key: "privacyPolicy" as const, label: "Privacy Policy", href: "/pages/privacy-policy" },
    { key: "returnPolicy" as const, label: "Return Policy", href: "/pages/return-policy" },
    { key: "termsOfService" as const, label: "Terms of Service", href: "/pages/terms-of-service" },
    { key: "contact" as const, label: "Contact", href: "/pages/contact" },
  ],
};
