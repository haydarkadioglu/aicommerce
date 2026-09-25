import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { z } from "zod";

const NicheSchema = z.object({
  keyword: z.string().min(2).max(200),
  storeId: z.string().optional(),
});

/**
 * Niche Expansion — auto-discovers complementary products for a niche.
 * If user selects "Brass Bee Decor", the AI recommends Brass Dragonfly,
 * Brass Butterfly, Brass Owl, etc. — all fitting the existing niche.
 *
 * For each recommended product, explains:
 *   - Why it matches the niche
 *   - Expected demand, competition, profit
 *   - Supplier availability, trend score
 *   - Visual consistency, cross-selling potential, bundle potential
 *   - Store compatibility
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = NicheSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  let storeContext = "";
  if (parsed.data.storeId) {
    const store = await db.store.findFirst({ where: { id: parsed.data.storeId, userId: user.id } });
    if (store) {
      storeContext = [
        store.niche ? `Store niche: ${store.niche}` : "",
        store.brandName ? `Brand: ${store.brandName}` : "",
        store.targetCustomer ? `Target customer: ${store.targetCustomer}` : "",
        store.avgSellingPrice ? `Avg price point: $${store.avgSellingPrice}` : "",
      ].filter(Boolean).join("\n");
    }
  }

  const prompt = `You are a niche expansion AI for e-commerce.

Base product/niche: "${parsed.data.keyword}"
${storeContext ? `Store context:\n${storeContext}` : ""}

Automatically discover 8-12 additional products that fit the SAME niche.
Think about: variations in subject (bee→dragonfly→butterfly), variations in material,
variations in use case, complementary categories, cross-selling opportunities.

Return a JSON array where each item has:
{
  "productTitle": "string",
  "category": "string",
  "whyItMatches": "1 sentence explaining why this fits the niche",
  "expectedDemand": "low" | "medium" | "high",
  "estimatedCompetition": "low" | "medium" | "high",
  "expectedProfit": "low" | "medium" | "high",
  "supplierAvailability": "easy" | "moderate" | "difficult",
  "trendScore": 0-100,
  "visualConsistency": "high" | "medium" | "low",
  "crossSellingPotential": "high" | "medium" | "low",
  "bundlePotential": "high" | "medium" | "low",
  "storeCompatibility": "high" | "medium" | "low"
}

Return ONLY a valid JSON array.`;

  try {
    const result = await orchestrator.chat({
      userId: user.id,
      agentKey: "research",
      messages: [{ role: "user", content: prompt }],
    });

    let recommendations: any[] = [];
    try {
      recommendations = JSON.parse(result.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
    } catch {
      recommendations = [];
    }

    // Persist as opportunity scans
    const saved = await Promise.all(
      recommendations.slice(0, 12).map((r) =>
        db.opportunityScan.create({
          data: {
            userId: user.id,
            storeId: parsed.data.storeId || null,
            scanType: "emerging-category",
            keyword: parsed.data.keyword,
            productTitle: r.productTitle || "Unknown",
            productSource: "niche-expansion",
            opportunityScore: r.trendScore ?? null,
            trendScore: r.trendScore ?? null,
            demandScore: r.expectedDemand === "high" ? 80 : r.expectedDemand === "medium" ? 50 : 20,
            competitionScore: r.estimatedCompetition === "high" ? 80 : r.estimatedCompetition === "medium" ? 50 : 20,
            aiSummary: r.whyItMatches || null,
            recommendedAction: `Add "${r.productTitle}" to your ${parsed.data.keyword} niche`,
            confidence: 70,
            metadata: JSON.stringify({ ...r, nicheKeyword: parsed.data.keyword }),
          },
        }).catch(() => null)
      )
    );

    await logger.audit({
      userId: user.id,
      action: "niche.expand",
      category: "ai",
      metadata: { keyword: parsed.data.keyword, recommendationsFound: recommendations.length, model: result.model },
    });

    return NextResponse.json({
      recommendations: recommendations.map((r, i) => ({ ...r, dbId: saved[i]?.id || null })),
      meta: { keyword: parsed.data.keyword, model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: result.latencyMs, storeContext: storeContext ? true : false },
    });
  } catch (err: any) {
    logger.error("api", "Niche expansion failed", { error: String(err) });
    return NextResponse.json({ error: "Niche expansion failed" }, { status: 500 });
  }
}
