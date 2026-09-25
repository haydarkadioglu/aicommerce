import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PricingSchema = z.object({ discoveredProductId: z.string(), action: z.enum(["analyze", "recommend"]).default("analyze") });

/**
 * Price Intelligence — monitors market pricing and detects:
 * price increases, price drops, outliers, undervalued/overpriced products.
 * Recommends optimal pricing.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = PricingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const product = await db.discoveredProduct.findFirst({ where: { id: parsed.data.discoveredProductId, OR: [{ userId: user.id }, { userId: null }] } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const prompt = `You are a price intelligence analyst. Analyze pricing for:
Product: ${product.title}
Source: ${product.source}
Current Price: ${product.price ? `$${product.price} ${product.currency}` : "N/A"}

Return JSON:
{
  "priceAnalysis": { "trend": "increasing"|"decreasing"|"stable", "volatility": "low"|"medium"|"high", "isUndervalued": boolean, "isOverpriced": boolean, "outlierStatus": "normal"|"outlier" },
  "optimalPrice": number,
  "priceRange": { "min": number, "max": number },
  "priceChanges": [array of { type: "increase"|"decrease"|"stable", description, magnitude }],
  "reasoning": "string",
  "recommendedAction": "string: raise/lower/maintain price + why",
  "confidence": 0-100
}

Return ONLY valid JSON.`;

  try {
    const result = await orchestrator.chat({ userId: user.id, agentKey: "pricing", messages: [{ role: "user", content: prompt }] });
    let analysis: any = null;
    try { analysis = JSON.parse(result.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { analysis = { rawContent: result.content, parseError: true }; }

    // Record price history
    if (product.price) {
      await db.priceHistory.create({ data: { discoveredProductId: product.id, userId: user.id, price: product.price, currency: product.currency, source: product.source, priceType: "listing" } });
    }

    await logger.audit({ userId: user.id, action: "pricing.analyze", category: "ai", resourceId: product.id, metadata: { model: result.model } });
    return NextResponse.json({ analysis, meta: { model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: result.latencyMs } });
  } catch (err: any) {
    logger.error("api", "Price intelligence failed", { error: String(err) });
    return NextResponse.json({ error: "Price analysis failed" }, { status: 500 });
  }
}
