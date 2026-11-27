/**
 * Keyword → industry category extractor and Unsplash asset mapper
 * for AI-generated business storefronts.
 */

export type IndustryCategory =
  | "clothing"
  | "fast_food"
  | "footwear"
  | "manufacturing"
  | "electronics"
  | "bakery"
  | "cafe"
  | "beauty"
  | "jewelry"
  | "fitness"
  | "grocery"
  | "furniture"
  | "automotive"
  | "books"
  | "general_retail";

export type IndustryAssetPack = {
  category: IndustryCategory;
  label: string;
  heroBanner: string;
  productImages: string[];
};

const U = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

/** Curated Unsplash collections per industry niche. */
export const INDUSTRY_ASSET_MAP: Record<IndustryCategory, IndustryAssetPack> = {
  clothing: {
    category: "clothing",
    label: "Clothing / Apparel",
    heroBanner: U("photo-1441986300917-64674bd600d8", 1200),
    productImages: [
      U("photo-1523381210434-271e8be1f52b"),
      U("photo-1489987707025-afc232f7ea0f"),
      U("photo-1551232864-3f0890e37d7a"),
      U("photo-1434389677669-e08b4cac3105"),
    ],
  },
  fast_food: {
    category: "fast_food",
    label: "Fast Food / Restaurant",
    heroBanner: U("photo-1517248135467-4c7edcad34c4", 1200),
    productImages: [
      U("photo-1568901346375-23c9450c58cd"),
      U("photo-1571091718767-18b5b1457add"),
      U("photo-1565299624946-b28f40a0ae38"),
      U("photo-1550547660-d9450f859918"),
    ],
  },
  footwear: {
    category: "footwear",
    label: "Footwear / Shoes",
    heroBanner: U("photo-1460353581641-37baddab0fa2", 1200),
    productImages: [
      U("photo-1542291026-7eec264c27ff"),
      U("photo-1549298916-b41d501d3772"),
      U("photo-1595950653106-6c9ebd614d3a"),
      U("photo-1606107557195-0e29a4b5b4aa"),
    ],
  },
  manufacturing: {
    category: "manufacturing",
    label: "Factories / Manufacturing",
    heroBanner: U("photo-1565043589221-1a6fd9ae45c7", 1200),
    productImages: [
      U("photo-1581091226825-a6a2a5aee158"),
      U("photo-1581092918056-0c4c3acd3789"),
      U("photo-1504328345606-18bbc8c9d7d1"),
      U("photo-1565793298595-6a879b1d9492"),
    ],
  },
  electronics: {
    category: "electronics",
    label: "Electronics / Gadgets",
    heroBanner: U("photo-1498049794561-7780e7231661", 1200),
    productImages: [
      U("photo-1511707171634-5f897ff02aa9"),
      U("photo-1505740420928-5e560c06d30e"),
      U("photo-1525547719571-a2d4ac882e75"),
      U("photo-1546868871-7041f2a55e12"),
    ],
  },
  bakery: {
    category: "bakery",
    label: "Bakery / Sweets",
    heroBanner: U("photo-1509440159596-0249088772ff", 1200),
    productImages: [
      U("photo-1578985545062-69928b1d9587"),
      U("photo-1558961363-fa8fdf82db35"),
      U("photo-1486427944299-d9226a73f701"),
      U("photo-1517433670267-08bbd4ba8330"),
    ],
  },
  cafe: {
    category: "cafe",
    label: "Cafe / Coffee",
    heroBanner: U("photo-1495474472287-4d71bcdd2085", 1200),
    productImages: [
      U("photo-1509042239860-f550ce710b93"),
      U("photo-1497935586351-b67a49e012bf"),
      U("photo-1511920170033-f8396924c348"),
      U("photo-1442512595331-e89e7384261f"),
    ],
  },
  beauty: {
    category: "beauty",
    label: "Beauty / Cosmetics",
    heroBanner: U("photo-1596462502278-27bfdd403348", 1200),
    productImages: [
      U("photo-1522335789203-aabd1fc54bc9"),
      U("photo-1512496015851-a90fb38ba796"),
      U("photo-1571781926291-c477ebfd024b"),
      U("photo-1586495777744-4413f21062fa"),
    ],
  },
  jewelry: {
    category: "jewelry",
    label: "Jewelry / Accessories",
    heroBanner: U("photo-1515562141207-7a88fb7ce338", 1200),
    productImages: [
      U("photo-1605100804763-247f67b3557e"),
      U("photo-1599643478518-a784e5dc4c8f"),
      U("photo-1611591437281-460bfbe1220a"),
      U("photo-1535632066927-ab7c9ab60908"),
    ],
  },
  fitness: {
    category: "fitness",
    label: "Fitness / Gym",
    heroBanner: U("photo-1534438327276-14e5300c3a48", 1200),
    productImages: [
      U("photo-1517836357463-d25dfeac3438"),
      U("photo-1571019614242-c5c5dee9f50b"),
      U("photo-1434682881908-b43d0467b798"),
      U("photo-1518611012118-696072aa579a"),
    ],
  },
  grocery: {
    category: "grocery",
    label: "Grocery / Fresh Produce",
    heroBanner: U("photo-1542838132-92c53300491e", 1200),
    productImages: [
      U("photo-1610832958506-aa56368176cf"),
      U("photo-1488459716781-31db5254d4bd"),
      U("photo-1604719312566-8912e9227c6a"),
      U("photo-1579113800032-c38cea7bfcff"),
    ],
  },
  furniture: {
    category: "furniture",
    label: "Furniture / Home",
    heroBanner: U("photo-1555041469-a586c61ea9bc", 1200),
    productImages: [
      U("photo-1567538096630-e0c55bd6374c"),
      U("photo-1586023492125-27b2c045efd7"),
      U("photo-1493663284031-b7e3aefcae8e"),
      U("photo-1555041469-a586c61ea9bc"),
    ],
  },
  automotive: {
    category: "automotive",
    label: "Automotive / Auto Parts",
    heroBanner: U("photo-1492144534655-ae79c964c9d7", 1200),
    productImages: [
      U("photo-1486262715619-67b85e0b08d3"),
      U("photo-1503376780353-7e6692767b70"),
      U("photo-1558618666-fcd25c85cd64"),
      U("photo-1619642751034-765dfdf7c58e"),
    ],
  },
  books: {
    category: "books",
    label: "Books / Stationery",
    heroBanner: U("photo-1507842217343-583bb7270b66", 1200),
    productImages: [
      U("photo-1512820790803-83ca734da794"),
      U("photo-1544947950-fa07a98d237f"),
      U("photo-1495446815901-a7297e633e8d"),
      U("photo-1456513080080-7e1e5c4a6c0a"),
    ],
  },
  general_retail: {
    category: "general_retail",
    label: "General Retail",
    heroBanner: U("photo-1441986300917-64674bd600d8", 1200),
    productImages: [
      U("photo-1472851294608-062f824d29cc"),
      U("photo-1607082348824-0a96f2a4b9da"),
      U("photo-1556742049-0cfed4f6a45d"),
      U("photo-1523275335684-37898b6baf30"),
    ],
  },
};

/** Keyword patterns ordered from most specific → general. */
const CATEGORY_KEYWORDS: Array<{ category: IndustryCategory; patterns: RegExp[] }> = [
  {
    category: "footwear",
    patterns: [
      /\b(shoe|shoes|footwear|sneaker|sneakers|boot|boots|sandal|heels|loafer|trainer)\b/i,
    ],
  },
  {
    category: "clothing",
    patterns: [
      /\b(cloth|clothing|apparel|fashion|garment|wardrobe|boutique|dress|dresses|shirt|t-?shirt|hoodie|jeans|outfit|wear|textile|tailor)\b/i,
    ],
  },
  {
    category: "electronics",
    patterns: [
      /\b(electronic|electronics|gadget|gadgets|phone|smartphone|laptop|tablet|tech|computer|headphone|camera|smartwatch)\b/i,
    ],
  },
  {
    category: "manufacturing",
    patterns: [
      /\b(factory|factories|manufactur|industrial|workshop|plant|machinery|production line|fabricat)\b/i,
    ],
  },
  {
    category: "fast_food",
    patterns: [
      /\b(fast\s*food|restaurant|burger|pizza|diner|eatery|bistro|grill|kebab|biryani|takeaway|food\s*truck|cuisine)\b/i,
    ],
  },
  {
    category: "bakery",
    patterns: [/\b(bakery|baker|cake|cakes|pastry|pastries|bread|donut|doughnut|cupcake|sweet\s*shop)\b/i],
  },
  {
    category: "cafe",
    patterns: [/\b(caf[eé]|coffee|espresso|latte|tea\s*house|roastery)\b/i],
  },
  {
    category: "beauty",
    patterns: [/\b(beauty|cosmetic|cosmetics|skincare|makeup|salon|spa|perfume)\b/i],
  },
  {
    category: "jewelry",
    patterns: [/\b(jewel|jewelry|jewellery|gold|diamond|necklace|bracelet|ring\b|ornament)\b/i],
  },
  {
    category: "fitness",
    patterns: [/\b(fitness|gym|workout|athletic|sportswear|yoga|crossfit)\b/i],
  },
  {
    category: "grocery",
    patterns: [/\b(grocery|grocer|supermarket|produce|fresh\s*food|organic\s*market|vegetables?|fruits?)\b/i],
  },
  {
    category: "furniture",
    patterns: [/\b(furniture|sofa|couch|interior|home\s*decor|mattress|cabinet)\b/i],
  },
  {
    category: "automotive",
    patterns: [/\b(auto|automotive|car\s*part|vehicle|garage|motor|tyre|tire)\b/i],
  },
  {
    category: "books",
    patterns: [/\b(book|books|bookstore|stationery|library|novel|publisher)\b/i],
  },
];

/** Parse prompt (+ optional business name) into an industry category. */
export function extractIndustryCategory(
  prompt: string,
  businessName = "",
): IndustryCategory {
  const haystack = `${businessName} ${prompt}`.trim();
  if (!haystack) return "general_retail";

  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.patterns.some((re) => re.test(haystack))) {
      return entry.category;
    }
  }
  return "general_retail";
}

/** Resolve Unsplash hero + product image pack for a prompt. */
export function resolveIndustryAssets(
  prompt: string,
  businessName = "",
): IndustryAssetPack {
  const category = extractIndustryCategory(prompt, businessName);
  return INDUSTRY_ASSET_MAP[category];
}

/** Pick product image URLs for N products from the pack (cycles). */
export function pickProductImages(
  pack: IndustryAssetPack,
  count: number,
): string[][] {
  const imgs = pack.productImages;
  const out: string[][] = [];
  for (let i = 0; i < count; i += 1) {
    const primary = imgs[i % imgs.length];
    const secondary = imgs[(i + 1) % imgs.length];
    out.push([primary, secondary]);
  }
  return out;
}
