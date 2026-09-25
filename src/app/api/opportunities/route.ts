import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { searchAcrossConnectors } from "@/lib/connectors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ScanSchema = z.object({
  scanType: z.enum([
    "trending",
    "low-competition",
    "high-roi",
    "seasonal",
    "emerging-category",
  ]).default("trending"),
  keyword: z.string().optional(),
  limit: z.number().int().min(3).max(20).default(10),
});

/**
 * Product Opportunity Scanner — continuously scans supported marketplaces
 * and auto-detects opportunities ranked by Opportunity Score.
 *
 * Scan types:
 *   - trending: newly trending products
 *   - low-competition: high demand, few sellers
 *   - high-roi: high profit potential
 *   - seasonal: upcoming seasonal opportunities
 *   - emerging-category: new product categories
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = ScanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const keyword = parsed.data.keyword || getDefaultKeyword(parsed.data.scanType);

  // Search across connectors to find products
  const searchResults = await searchAcrossConnectors({
    mode: parsed.data.scanType === "seasonal" ? "trend" : "keyword",
    query: keyword,
    limit: parsed.data.limit,
  });

  // Use AI to rank + summarize opportunities
  const prompt = `You are a product opportunity scanner for e-commerce.

Scan type: ${parsed.data.scanType}
Keyword: ${keyword}

Discovered products:
${searchResults.map((p, i) => `${i + 1}. ${p.title} (${p.source}, $${p.price || "N/A"})`).join("\n")}

For the TOP ${Math.min(5, searchResults.length)} opportunities, return a JSON array where each item has:
{
  "productTitle": "string",
  "productSource": "string",
  "opportunityScore": 0-100,
  "trendScore": 0-100,
  "demandScore": 0-100,
  "competitionScore": 0-100 (higher = MORE competition),
  "profitScore": 0-100,
  "aiSummary": "1-2 sentence summary of WHY this is an opportunity",
  "risks": ["array of risk strings"],
  "recommendedAction": "string: what the user should do next",
  "confidence": 0-100
}

Focus on ${parsed.data.scanType === "trending" ? "products with rising momentum" : parsed.data.scanType === "low-competition" ? "products where demand exceeds supply" : parsed.data.scanType === "high-roi" ? "products with the best cost-to-price ratio" : parsed.data.scanType === "seasonal" ? "products tied to upcoming seasonal demand" : "products in new/emerging categories"}.

Return ONLY a valid JSON array.`;

  try {
    const result = await orchestrator.chat({
      userId: user.id,
      agentKey: "research",
      messages: [{ role: "user", content: prompt }],
    });

    let opportunities: any[] = [];
    try {
      const cleaned = result.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      opportunities = JSON.parse(cleaned);
    } catch {
      opportunities = [];
    }

    // Persist top opportunities to DB
    const saved = await Promise.all(
      opportunities.slice(0, 10).map(async (opp) => {
        try {
          return await db.opportunityScan.create({
            data: {
              userId: user.id,
              scanType: parsed.data.scanType,
              keyword: keyword,
              productTitle: opp.productTitle || "Unknown",
              productSource: opp.productSource || "unknown",
              sourceUrl: opp.sourceUrl || null,
              imageUrl: opp.imageUrl || null,
              opportunityScore: opp.opportunityScore ?? null,
              trendScore: opp.trendScore ?? null,
              demandScore: opp.demandScore ?? null,
              competitionScore: opp.competitionScore ?? null,
              profitScore: opp.profitScore ?? null,
              aiSummary: opp.aiSummary || null,
              risks: opp.risks ? JSON.stringify(opp.risks) : null,
              recommendedAction: opp.recommendedAction || null,
              confidence: opp.confidence ?? null,
              metadata: JSON.stringify({
                model: result.model,
                tokensIn: result.tokensIn,
                tokensOut: result.tokensOut,
                latencyMs: result.latencyMs,
              }),
            },
          });
        } catch {
          return null;
        }
      })
    );

    await logger.audit({
      userId: user.id,
      action: "opportunities.scan",
      category: "ai",
      metadata: {
        scanType: parsed.data.scanType,
        keyword,
        opportunitiesFound: opportunities.length,
        model: result.model,
      },
    });

    return NextResponse.json({
      opportunities: opportunities.map((opp, i) => ({
        ...opp,
        dbId: saved[i]?.id || null,
      })),
      meta: {
        scanType: parsed.data.scanType,
        keyword,
        totalFound: searchResults.length,
        ranked: opportunities.length,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
      },
    });
  } catch (err: any) {
    logger.error("api", "Opportunity scan failed", { error: String(err) });
    return NextResponse.json(
      { error: "Opportunity scan failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET — list past opportunity scans.
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const scanType = url.searchParams.get("type");
  const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 50);

  const opportunities = await db.opportunityScan.findMany({
    where: {
      userId: user.id,
      ...(scanType ? { scanType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ opportunities });
}

function getDefaultKeyword(scanType: string): string {
  const defaults: Record<string, string> = {
    trending: "trending handmade products 2026",
    "low-competition": "niche handmade low competition",
    "high-roi": "high margin handmade products",
    seasonal: "seasonal holiday gifts 2026",
    "emerging-category": "emerging product categories 2026",
  };
  return defaults[scanType] || "handmade products";
}
