import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ResearchSchema = z.object({
  discoveredProductId: z.string(),
  storeId: z.string().optional(),
});

/**
 * Market Research — collects comprehensive intelligence for a product.
 * Estimates: sales, demand, trend, competition, saturation, price,
 * discount, reviews, favorites, order volume, monthly/yearly sales,
 * growth, seasonality, product age, seller history, top keywords,
 * listing quality, image quality, video availability, store reputation.
 *
 * For Etsy products specifically: number of similar stores, strongest stores,
 * review velocity, delivery time, SEO strength, positioning, similar listings,
 * cross-selling and bundle opportunities.
 *
 * All data is normalized into a common model and persisted to ProductAnalysis.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = ResearchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const product = await db.discoveredProduct.findFirst({
    where: { id: parsed.data.discoveredProductId, OR: [{ userId: user.id }, { userId: null }] },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const isEtsy = product.source === "etsy";

  const prompt = `You are a market research analyst. Analyze this product comprehensively:

Product: ${product.title}
Source: ${product.source}
Price: ${product.price ? `$${product.price} ${product.currency}` : "N/A"}
Category: ${product.category || "N/A"}
${product.tags ? `Tags: ${product.tags}` : ""}
${product.materials ? `Materials: ${product.materials}` : ""}

${isEtsy ? "This is an Etsy product — include Etsy-specific analysis." : "This is from " + product.source + "."}

Return a JSON object with ALL of these fields:
{
  "estimatedSales": number (monthly),
  "estimatedDemand": "low" | "medium" | "high",
  "trendScore": 0-100,
  "competitionScore": 0-100 (higher = MORE competition),
  "marketSaturation": "low" | "medium" | "high",
  "averageSellingPrice": number,
  "averageDiscount": number (percentage),
  "reviewCount": number (estimated total reviews across similar products),
  "favoriteCount": number (estimated favorites/hearts),
  "approximateOrderVolume": number (monthly orders across the niche),
  "estimatedMonthlySales": number,
  "estimatedYearlySales": number,
  "growthTrend": "rising" | "stable" | "declining",
  "seasonality": "year-round" | "seasonal" | "holiday" | "trending",
  "productAge": "new" | "established" | "mature",
  "sellerHistory": "new seller" | "experienced" | "top-rated" | "unknown",
  "topKeywords": ["array of 10 top-performing keywords"],
  "listingQuality": "poor" | "fair" | "good" | "excellent",
  "imageQuality": "poor" | "fair" | "good" | "excellent",
  "videoAvailability": boolean,
  "storeReputation": "low" | "medium" | "high",
  ${isEtsy ? `
  "etsySpecific": {
    "similarStoresCount": number,
    "strongestStores": ["array of store names that appear strongest"],
    "reviewVelocity": "low" | "medium" | "high",
    "averageDeliveryTime": "string (e.g. 3-5 days)",
    "seoStrength": 0-100,
    "productPositioning": "string describing how the product is positioned",
    "similarListings": ["array of 3-5 similar listing titles"],
    "alternativeListings": ["array of 3-5 alternative product ideas"],
    "crossSellingOpportunities": ["array of cross-sell products"],
    "bundleOpportunities": ["array of bundle ideas"]
  },` : ""}
  "opportunityScore": 0-100,
  "riskScore": 0-100 (higher = MORE risk),
  "reasoning": "detailed explanation in plain language",
  "recommendations": ["array of actionable next steps"]
}

Return ONLY valid JSON.`;

  try {
    const result = await orchestrator.chat({
      userId: user.id,
      agentKey: "research",
      messages: [{ role: "user", content: prompt }],
    });

    let research: any = null;
    try {
      research = JSON.parse(result.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
    } catch {
      research = { rawContent: result.content, parseError: true };
    }

    // Persist as a ProductAnalysis
    const saved = await db.productAnalysis.create({
      data: {
        userId: user.id,
        discoveredProductId: product.id,
        agentKey: "research",
        trendScore: research.trendScore ?? null,
        demandScore: research.estimatedDemand === "high" ? 80 : research.estimatedDemand === "medium" ? 50 : 20,
        competitionScore: research.competitionScore ?? null,
        opportunityScore: research.opportunityScore ?? null,
        riskScore: research.riskScore ?? null,
        estimatedMonthlySales: research.estimatedMonthlySales ?? null,
        estimatedRevenue: research.estimatedMonthlySales && research.averageSellingPrice
          ? research.estimatedMonthlySales * research.averageSellingPrice : null,
        marketSaturation: research.marketSaturation ?? null,
        seasonality: research.seasonality ?? null,
        growthPotential: research.growthTrend === "rising" ? "high" : research.growthTrend === "stable" ? "medium" : "low",
        reasoning: research.reasoning ?? null,
        recommendations: research.recommendations ? JSON.stringify(research.recommendations) : null,
        metadata: JSON.stringify({ ...research, model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: result.latencyMs, isEtsy }),
      },
    });

    await logger.audit({
      userId: user.id,
      action: "research.analyze",
      category: "ai",
      resourceId: product.id,
      metadata: { model: result.model, isEtsy, tokensOut: result.tokensOut },
    });

    return NextResponse.json({
      research,
      analysisId: saved.id,
      meta: { model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: result.latencyMs, isEtsy },
    });
  } catch (err: any) {
    logger.error("api", "Market research failed", { error: String(err) });
    return NextResponse.json({ error: "Research failed" }, { status: 500 });
  }
}
