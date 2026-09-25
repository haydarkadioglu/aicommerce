import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { searchAcrossConnectors, detectSearchMode, type SearchMode } from "@/lib/connectors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const HunterSchema = z.object({
  query: z.string().min(2).max(500),
  storeId: z.string().optional(),
  mode: z.enum(["keyword", "image", "url", "category", "trend", "style", "material"]).optional(),
  sources: z.array(z.string()).optional(),
  limit: z.number().int().min(3).max(30).default(15),
});

/**
 * AI Product Hunter — the main feature.
 * Accepts natural language queries like:
 *   "I want premium dog decor"
 *   "Luxury brass bee"
 *   "Minimalist bathroom accessories"
 *
 * The AI parses the query intent, extracts keywords/style/material,
 * searches across marketplaces, and returns enriched results with
 * store-aware context.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = HunterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { query, storeId, limit } = parsed.data;
  const mode: SearchMode = parsed.data.mode || detectSearchMode(query);

  // Load store intelligence if storeId is provided
  let storeContext = "";
  if (storeId) {
    const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
    if (store) {
      storeContext = [
        store.niche ? `Store niche: ${store.niche}` : "",
        store.targetCustomer ? `Target customer: ${store.targetCustomer}` : "",
        store.brandWritingStyle ? `Brand writing style: ${store.brandWritingStyle}` : "",
        store.avgSellingPrice ? `Average selling price: $${store.avgSellingPrice}` : "",
        store.preferredProfitMargin ? `Target margin: ${store.preferredProfitMargin}%` : "",
      ].filter(Boolean).join("\n");
    }
  }

  // Use AI to parse the natural language query into search keywords
  const intentPrompt = `You are a product search assistant. Parse this user query into structured search terms.

User query: "${query}"
${storeContext ? `Store context:\n${storeContext}` : ""}

Return a JSON object:
{
  "primaryKeyword": "the main product keyword",
  "style": "detected style if any (e.g. luxury, minimalist, rustic)",
  "material": "detected material if any (e.g. brass, wood, ceramic)",
  "category": "detected category if any",
  "marketplace": "detected target marketplace if any",
  "expandedKeywords": ["array of 5-10 related keywords to search across marketplaces"],
  "searchStrategy": "keyword" | "category" | "style" | "material",
  "reasoning": "1 sentence explaining the interpretation"
}
Return ONLY valid JSON.`;

  const intentResult = await orchestrator.chat({
    userId: user.id,
    agentKey: "research",
    messages: [{ role: "user", content: intentPrompt }],
  });

  let intent: any = null;
  try {
    intent = JSON.parse(intentResult.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
  } catch {
    intent = { primaryKeyword: query, expandedKeywords: [query], searchStrategy: "keyword" };
  }

  // Search across connectors using the expanded keywords
  const searchQuery = intent.primaryKeyword || query;
  const searchResults = await searchAcrossConnectors(
    {
      mode: (intent.searchStrategy as SearchMode) || mode,
      query: searchQuery,
      limit,
    },
    parsed.data.sources
  );

  // Persist discovered products with store association
  const persisted = await Promise.all(
    searchResults.map(async (p) => {
      try {
        return await db.discoveredProduct.create({
          data: {
            userId: user.id,
            storeId: storeId || null,
            source: p.source,
            sourceId: p.sourceId || null,
            sourceUrl: p.sourceUrl || null,
            title: p.title,
            description: p.description || null,
            imageUrl: p.imageUrl || null,
            category: p.category || intent.category || null,
            price: p.price || null,
            currency: p.currency || "USD",
            tags: p.tags ? JSON.stringify(p.tags) : null,
            materials: p.materials ? JSON.stringify(p.materials) : null,
            marketplace: "etsy",
            metadata: { ...p.metadata, intent } ? JSON.stringify({ ...p.metadata, intent }) : null,
          },
          select: { id: true, title: true, source: true, price: true },
        });
      } catch { return null; }
    })
  );

  await logger.audit({
    userId: user.id,
    action: "hunter.search",
    category: "ai",
    metadata: { query, mode, resultsFound: searchResults.length, intent: intent.primaryKeyword, model: intentResult.model },
  });

  return NextResponse.json({
    intent,
    results: searchResults.map((r, i) => ({
      ...r,
      dbId: persisted[i]?.id || null,
    })),
    meta: {
      totalFound: searchResults.length,
      model: intentResult.model,
      tokensIn: intentResult.tokensIn,
      tokensOut: intentResult.tokensOut,
      latencyMs: intentResult.latencyMs,
      storeContext: storeContext ? true : false,
    },
  });
}

export async function GET() {
  return NextResponse.json({
    description: "AI Product Hunter — search by natural language, keyword, image, URL, category, trend, style, or material",
    examples: [
      "I want premium dog decor",
      "Luxury brass bee",
      "Minimalist bathroom accessories",
      "handcrafted walnut wood wall clock",
    ],
  });
}
