import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { searchAcrossConnectors, detectSearchMode, listConnectors, type SearchMode } from "@/lib/connectors";
import { z } from "zod";

const SearchSchema = z.object({
  query: z.string().min(1).max(500),
  mode: z.enum(["keyword", "image", "url", "category", "trend", "style", "material"]).optional(),
  imageUrl: z.string().url().optional(),
  sources: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).default(10),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  persist: z.boolean().default(true),
});

/**
 * Product Discovery Engine — searches across all registered marketplace
 * connectors (Etsy, Alibaba, 1688, Amazon, Pinterest, Google Trends,
 * TikTok) and returns unified results. Optionally persists to DB.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = SearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const mode: SearchMode = parsed.data.mode || detectSearchMode(parsed.data.query);
  const input = {
    mode,
    query: parsed.data.query,
    imageUrl: parsed.data.imageUrl,
    limit: parsed.data.limit,
    minPrice: parsed.data.minPrice,
    maxPrice: parsed.data.maxPrice,
  };

  const started = Date.now();
  try {
    const results = await searchAcrossConnectors(input, parsed.data.sources);

    // Persist discovered products to DB
    let persisted: { id: string; source: string; title: string; price: number | null; imageUrl: string | null; sourceUrl: string | null }[] = [];
    if (parsed.data.persist && results.length > 0) {
      const created = await Promise.all(
        results.map(async (p) => {
          try {
            return await db.discoveredProduct.create({
              data: {
                userId: user.id,
                source: p.source,
                sourceId: p.sourceId || null,
                sourceUrl: p.sourceUrl || null,
                title: p.title,
                description: p.description || null,
                imageUrl: p.imageUrl || null,
                category: p.category || null,
                price: p.price || null,
                currency: p.currency || "USD",
                tags: p.tags ? JSON.stringify(p.tags) : null,
                materials: p.materials ? JSON.stringify(p.materials) : null,
                marketplace: "etsy",
                metadata: p.metadata ? JSON.stringify(p.metadata) : null,
              },
              select: {
                id: true,
                source: true,
                title: true,
                price: true,
                imageUrl: true,
                sourceUrl: true,
              },
            });
          } catch {
            return null;
          }
        })
      );
      persisted = created.filter((c): c is NonNullable<typeof c> => c !== null);
    }

    await logger.audit({
      userId: user.id,
      action: "intelligence.discover",
      category: "ai",
      metadata: {
        query: parsed.data.query,
        mode,
        sources: parsed.data.sources || "all",
        resultCount: results.length,
        persistedCount: persisted.length,
        latencyMs: Date.now() - started,
      },
    });

    return NextResponse.json({
      query: parsed.data.query,
      mode,
      results: results.map((r, i) => ({
        ...r,
        dbId: persisted[i]?.id || null,
      })),
      meta: {
        totalFound: results.length,
        persisted: persisted.length,
        latencyMs: Date.now() - started,
        connectors: listConnectors(),
      },
    });
  } catch (err: any) {
    logger.error("api", "Discovery failed", { error: String(err) });
    return NextResponse.json(
      { error: "Discovery failed. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  // List available connectors + their supported search modes
  return NextResponse.json({
    connectors: listConnectors(),
  });
}
