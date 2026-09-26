/**
 * Marketplace Connector Abstraction
 * --------------------------------
 * Every marketplace/source implements the same `MarketplaceConnector`
 * interface. Adding a new source (Etsy, Alibaba, 1688, Amazon, Pinterest,
 * Google Trends, TikTok, Instagram, Reddit, etc.) only requires:
 *   1. Implementing the connector class below (with real API calls)
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
  source: string;
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
  query: string;
  imageUrl?: string;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  marketplace?: string;
};

export interface MarketplaceConnector {
  key: string;
  name: string;
  supportedModes: SearchMode[];
  search(input: SearchInput): Promise<ConnectorProduct[]>;
  fetchProduct?(sourceUrl: string): Promise<ConnectorProduct | null>;
  /** Whether this connector has real API credentials configured */
  isConfigured?: boolean;
}

// ============================================================
// Built-in connectors — all return empty results until configured
// with real API credentials. This ensures NO mock data is returned.
// To activate a connector, implement real API calls in its search()
// method and set isConfigured = true when credentials are available.
// ============================================================

/**
 * Etsy Connector — requires Etsy API v3 OAuth credentials.
 * Configure in Admin Panel → AI Providers → API Connections.
 */
class EtsyConnector implements MarketplaceConnector {
  key = "etsy";
  name = "Etsy";
  isConfigured = false;
  supportedModes: SearchMode[] = [
    "keyword",
    "category",
    "trend",
    "style",
    "material",
  ];

  async search(_input: SearchInput): Promise<ConnectorProduct[]> {
    // No mock data — returns empty until real API credentials are configured.
    // To implement: call Etsy API v3 with OAuth token from store.apiConnections.
    return [];
  }
}

/**
 * Alibaba Connector — requires Alibaba Open API credentials.
 */
class AlibabaConnector implements MarketplaceConnector {
  key = "alibaba";
  name = "Alibaba";
  isConfigured = false;
  supportedModes: SearchMode[] = ["keyword", "category", "material"];

  async search(_input: SearchInput): Promise<ConnectorProduct[]> {
    return [];
  }
}

/**
 * 1688 Connector — requires 1688 Open Platform API credentials.
 */
class Connector1688 implements MarketplaceConnector {
  key = "1688";
  name = "1688";
  isConfigured = false;
  supportedModes: SearchMode[] = ["keyword", "category", "material"];

  async search(_input: SearchInput): Promise<ConnectorProduct[]> {
    return [];
  }
}

/**
 * Amazon Connector — requires Amazon Product Advertising API credentials.
 */
class AmazonConnector implements MarketplaceConnector {
  key = "amazon";
  name = "Amazon";
  isConfigured = false;
  supportedModes: SearchMode[] = ["keyword", "category"];

  async search(_input: SearchInput): Promise<ConnectorProduct[]> {
    return [];
  }
}

/**
 * Pinterest Connector — requires Pinterest API credentials.
 */
class PinterestConnector implements MarketplaceConnector {
  key = "pinterest";
  name = "Pinterest";
  isConfigured = false;
  supportedModes: SearchMode[] = ["keyword", "trend", "style"];

  async search(_input: SearchInput): Promise<ConnectorProduct[]> {
    return [];
  }
}

/**
 * Google Trends Connector — can use the unofficial google-trends-api npm
 * package or a scraping approach. Requires no credentials but may need
 * rate-limit handling.
 */
class GoogleTrendsConnector implements MarketplaceConnector {
  key = "google-trends";
  name = "Google Trends";
  isConfigured = false;
  supportedModes: SearchMode[] = ["keyword", "trend"];

  async search(_input: SearchInput): Promise<ConnectorProduct[]> {
    return [];
  }
}

/**
 * TikTok Connector — requires TikTok Research API or TikTok Shop API credentials.
 */
class TikTokConnector implements MarketplaceConnector {
  key = "tiktok";
  name = "TikTok";
  isConfigured = false;
  supportedModes: SearchMode[] = ["keyword", "trend"];

  async search(_input: SearchInput): Promise<ConnectorProduct[]> {
    return [];
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

export function listConnectors(): Array<{
  key: string;
  name: string;
  supportedModes: SearchMode[];
  isConfigured: boolean;
}> {
  return Object.values(CONNECTORS).map((c) => ({
    key: c.key,
    name: c.name,
    supportedModes: c.supportedModes,
    isConfigured: c.isConfigured ?? false,
  }));
}

/**
 * Run a search across all (or a subset of) registered connectors.
 * Merges results into a flat array, tagged by source.
 * Returns empty array if no connectors are configured with real APIs.
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
