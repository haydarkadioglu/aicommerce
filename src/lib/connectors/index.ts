/**
 * Marketplace Connector Abstraction
 * --------------------------------
 * Every marketplace/source implements the same `MarketplaceConnector`
 * interface. Adding a new source (Etsy, Alibaba, 1688, Amazon, Pinterest,
 * Google Trends, TikTok, Instagram, Reddit, etc.) only requires:
 *   1. Implementing the connector class below
 *   2. Registering it in the `CONNECTORS` map
 *
 * The discovery engine calls `search()` across all registered connectors
 * (or a subset) and merges results into a unified `DiscoveredProduct[]`.
 *
 * Future-proof: supports keyword, image, URL, category, trend, style, and
 * material search modes. Each connector can implement any subset — those
 * that don't support a mode simply return an empty array.
 */

export type SearchMode =
  | "keyword"
  | "image"
  | "url"
  | "category"
  | "trend"
  | "style"
  | "material";

export type ConnectorProduct = {
  source: string; // etsy | alibaba | 1688 | amazon | pinterest | google-trends | tiktok | instagram | reddit
  sourceId?: string;
  sourceUrl?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  price?: number;
  currency?: string;
  tags?: string[];
  materials?: string[];
  metadata?: Record<string, unknown>;
};

export type SearchInput = {
  mode: SearchMode;
  query: string; // keyword, URL, category name, trend, style, or material
  imageUrl?: string; // for image search mode
  limit?: number;
  // Filters
  minPrice?: number;
  maxPrice?: number;
  marketplace?: string; // target marketplace filter
};

export interface MarketplaceConnector {
  key: string; // etsy | alibaba | 1688 | etc.
  name: string;
  supportedModes: SearchMode[];
  search(input: SearchInput): Promise<ConnectorProduct[]>;
  /** Optional: fetch a single product by source URL or ID */
  fetchProduct?(sourceUrl: string): Promise<ConnectorProduct | null>;
}

// ============================================================
// Built-in connectors
// ============================================================

/**
 * Etsy Connector — uses the AI orchestrator to simulate Etsy search
 * results. In production this would call the Etsy API (v3) with an OAuth
 * token. For now we return AI-estimated product ideas so the discovery
 * engine has data to analyze.
 */
class EtsyConnector implements MarketplaceConnector {
  key = "etsy";
  name = "Etsy";
  supportedModes: SearchMode[] = [
    "keyword",
    "category",
    "trend",
    "style",
    "material",
  ];

  async search(input: SearchInput): Promise<ConnectorProduct[]> {
    // Simulated results — in production, call Etsy API
    const limit = input.limit || 10;
    const products: ConnectorProduct[] = [];
    const basePrice = 15 + Math.floor(Math.random() * 75);
    for (let i = 0; i < limit; i++) {
      products.push({
        source: this.key,
        sourceId: `etsy-${Date.now()}-${i}`,
        sourceUrl: `https://etsy.com/listing/simulated-${i}`,
        title: `${input.query} — Handmade Variation ${i + 1}`,
        description: `A handcrafted ${input.query} with unique artisan details. Made with care, ships in 3-5 business days.`,
        imageUrl: undefined, // Would be real image URLs in production
        category: input.mode === "category" ? input.query : "Handmade",
        price: basePrice + i * 5,
        currency: "USD",
        tags: [input.query.toLowerCase(), "handmade", "unique"],
        materials: ["wood", "metal", "fabric"],
        metadata: {
          simulated: true,
          shopName: `ArtisanShop${i + 1}`,
          rating: 4.5 + Math.random() * 0.5,
          reviews: 50 + Math.floor(Math.random() * 500),
        },
      });
    }
    return products;
  }
}

/**
 * Alibaba Connector — simulates B2B supplier listings.
 * In production, would use the Alibaba Open API.
 */
class AlibabaConnector implements MarketplaceConnector {
  key = "alibaba";
  name = "Alibaba";
  supportedModes: SearchMode[] = ["keyword", "category", "material"];

  async search(input: SearchInput): Promise<ConnectorProduct[]> {
    const limit = Math.min(input.limit || 8, 8);
    const products: ConnectorProduct[] = [];
    const baseCost = 2 + Math.random() * 15;
    for (let i = 0; i < limit; i++) {
      products.push({
        source: this.key,
        sourceId: `alibaba-${Date.now()}-${i}`,
        sourceUrl: `https://alibaba.com/product/simulated-${i}`,
        title: `${input.query} — Wholesale Lot ${i + 1}`,
        description: `Factory-direct ${input.query}. MOQ 100 units. Trade Assurance available. Gold Supplier.`,
        category: input.mode === "category" ? input.query : "Wholesale",
        price: Math.round(baseCost + i * 0.5),
        currency: "USD",
        tags: [input.query.toLowerCase(), "wholesale", "moq-100"],
        materials: ["mixed materials"],
        metadata: {
          simulated: true,
          supplierName: `Factory${i + 1}`,
          supplierType: "manufacturer",
          country: "China",
          moq: 100,
          tradeAssurance: Math.random() > 0.3,
          goldSupplier: Math.random() > 0.5,
          yearsInBusiness: 1 + Math.floor(Math.random() * 15),
          leadTimeDays: 7 + Math.floor(Math.random() * 30),
        },
      });
    }
    return products;
  }
}

/**
 * 1688 Connector — domestic Chinese marketplace (lower prices, higher MOQs).
 */
class Connector1688 implements MarketplaceConnector {
  key = "1688";
  name = "1688";
  supportedModes: SearchMode[] = ["keyword", "category", "material"];

  async search(input: SearchInput): Promise<ConnectorProduct[]> {
    const limit = Math.min(input.limit || 6, 6);
    const products: ConnectorProduct[] = [];
    const baseCost = 1 + Math.random() * 8;
    for (let i = 0; i < limit; i++) {
      products.push({
        source: this.key,
        sourceId: `1688-${Date.now()}-${i}`,
        sourceUrl: `https://1688.com/offer/simulated-${i}`,
        title: `${input.query} — 工厂直供 ${i + 1}`,
        description: `Domestic wholesale ${input.query}. Lower MOQ, faster domestic shipping.`,
        category: input.mode === "category" ? input.query : "Wholesale",
        price: Math.round(baseCost + i * 0.3),
        currency: "CNY",
        tags: [input.query.toLowerCase(), "factory-direct", "domestic"],
        materials: ["mixed materials"],
        metadata: {
          simulated: true,
          supplierName: `国内工厂${i + 1}`,
          supplierType: "manufacturer",
          country: "China",
          moq: 50,
          leadTimeDays: 3 + Math.floor(Math.random() * 14),
        },
      });
    }
    return products;
  }
}

/**
 * Amazon Connector — competitive analysis data source.
 */
class AmazonConnector implements MarketplaceConnector {
  key = "amazon";
  name = "Amazon";
  supportedModes: SearchMode[] = ["keyword", "category"];

  async search(input: SearchInput): Promise<ConnectorProduct[]> {
    const limit = Math.min(input.limit || 6, 6);
    const products: ConnectorProduct[] = [];
    const basePrice = 10 + Math.floor(Math.random() * 60);
    for (let i = 0; i < limit; i++) {
      products.push({
        source: this.key,
        sourceId: `amazon-${Date.now()}-${i}`,
        sourceUrl: `https://amazon.com/dp/simulated-${i}`,
        title: `${input.query} — Amazon Listing ${i + 1}`,
        description: `Amazon-sold ${input.query}. Prime eligible. High volume seller.`,
        category: input.mode === "category" ? input.query : "General",
        price: basePrice + i * 3,
        currency: "USD",
        tags: [input.query.toLowerCase(), "prime"],
        materials: ["various"],
        metadata: {
          simulated: true,
          asin: `B0${Date.now()}${i}`,
          rating: 4.0 + Math.random() * 0.8,
          reviews: 100 + Math.floor(Math.random() * 2000),
          bsr: 1000 + Math.floor(Math.random() * 50000),
        },
      });
    }
    return products;
  }
}

/**
 * Pinterest Connector — trend/inspiration source.
 */
class PinterestConnector implements MarketplaceConnector {
  key = "pinterest";
  name = "Pinterest";
  supportedModes: SearchMode[] = ["keyword", "trend", "style"];

  async search(input: SearchInput): Promise<ConnectorProduct[]> {
    const limit = Math.min(input.limit || 5, 5);
    const products: ConnectorProduct[] = [];
    for (let i = 0; i < limit; i++) {
      products.push({
        source: this.key,
        sourceId: `pin-${Date.now()}-${i}`,
        sourceUrl: `https://pinterest.com/pin/simulated-${i}`,
        title: `${input.query} — Pin Inspiration ${i + 1}`,
        description: `Pinterest trend: ${input.query} is gaining saves. Visual style: ${
          input.mode === "style" ? input.query : "aesthetic"
        }.`,
        category: "Inspiration",
        tags: [input.query.toLowerCase(), "trend", "inspiration"],
        metadata: {
          simulated: true,
          saves: 100 + Math.floor(Math.random() * 5000),
          trend: "rising",
        },
      });
    }
    return products;
  }
}

/**
 * Google Trends Connector — pure trend data, no products.
 */
class GoogleTrendsConnector implements MarketplaceConnector {
  key = "google-trends";
  name = "Google Trends";
  supportedModes: SearchMode[] = ["keyword", "trend"];

  async search(input: SearchInput): Promise<ConnectorProduct[]> {
    const limit = Math.min(input.limit || 3, 3);
    const products: ConnectorProduct[] = [];
    for (let i = 0; i < limit; i++) {
      products.push({
        source: this.key,
        sourceId: `gt-${Date.now()}-${i}`,
        sourceUrl: `https://trends.google.com/trends/explore?q=${encodeURIComponent(
          input.query
        )}`,
        title: `Google Trends: "${input.query}" — ${["Rising", "Stable", "Seasonal"][i % 3]}`,
        description: `Search interest for "${input.query}" over the past 12 months. Breakout in the last 3 months.`,
        category: "Trend Data",
        tags: [input.query.toLowerCase(), "trend-data"],
        metadata: {
          simulated: true,
          interestOverTime: [20, 25, 30, 35, 45, 50, 60, 75, 80, 85, 90, 95],
          relatedQueries: [`${input.query} ideas`, `best ${input.query}`, `cheap ${input.query}`],
          trend: i === 0 ? "rising" : i === 1 ? "stable" : "seasonal",
        },
      });
    }
    return products;
  }
}

/**
 * TikTok Connector — viral product discovery.
 */
class TikTokConnector implements MarketplaceConnector {
  key = "tiktok";
  name = "TikTok";
  supportedModes: SearchMode[] = ["keyword", "trend"];

  async search(input: SearchInput): Promise<ConnectorProduct[]> {
    const limit = Math.min(input.limit || 4, 4);
    const products: ConnectorProduct[] = [];
    for (let i = 0; i < limit; i++) {
      products.push({
        source: this.key,
        sourceId: `tt-${Date.now()}-${i}`,
        sourceUrl: `https://tiktok.com/@creator/video/simulated-${i}`,
        title: `TikTok Viral: ${input.query} — ${i + 1}M views`,
        description: `Trending ${input.query} video with millions of views. High engagement, product-tagged content.`,
        category: "Viral Content",
        tags: [input.query.toLowerCase(), "viral", "tiktok"],
        metadata: {
          simulated: true,
          views: (i + 1) * 1_000_000,
          likes: 50_000 + Math.floor(Math.random() * 500_000),
          trend: "viral",
        },
      });
    }
    return products;
  }
}

// ============================================================
// Connector Registry
// ============================================================

const CONNECTORS: Record<string, MarketplaceConnector> = {
  etsy: new EtsyConnector(),
  alibaba: new AlibabaConnector(),
  "1688": new Connector1688(),
  amazon: new AmazonConnector(),
  pinterest: new PinterestConnector(),
  "google-trends": new GoogleTrendsConnector(),
  tiktok: new TikTokConnector(),
};

export function getConnector(key: string): MarketplaceConnector | undefined {
  return CONNECTORS[key];
}

export function listConnectors(): Array<{ key: string; name: string; supportedModes: SearchMode[] }> {
  return Object.values(CONNECTORS).map((c) => ({
    key: c.key,
    name: c.name,
    supportedModes: c.supportedModes,
  }));
}

/**
 * Run a search across all (or a subset of) registered connectors.
 * Merges results into a flat array, tagged by source.
 */
export async function searchAcrossConnectors(
  input: SearchInput,
  sources?: string[]
): Promise<ConnectorProduct[]> {
  const activeConnectors = sources
    ? sources
        .map((s) => CONNECTORS[s])
        .filter(Boolean)
    : Object.values(CONNECTORS);

  const results = await Promise.allSettled(
    activeConnectors.map(async (conn) => {
      // Skip connectors that don't support the requested mode
      if (!conn.supportedModes.includes(input.mode)) return [];
      try {
        return await conn.search(input);
      } catch {
        return [];
      }
    })
  );

  const merged: ConnectorProduct[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      merged.push(...result.value);
    }
  }
  return merged;
}

/**
 * Detect search mode from a query string:
 *   - Starts with http → "url"
 *   - Looks like an image URL (ends with .jpg/.png/.webp) → "image"
 *   - Otherwise → "keyword"
 */
export function detectSearchMode(query: string): SearchMode {
  const trimmed = query.trim();
  if (trimmed.match(/^https?:\/\//i)) {
    if (trimmed.match(/\.(jpg|jpeg|png|webp|gif)$/i)) return "image";
    return "url";
  }
  return "keyword";
}
