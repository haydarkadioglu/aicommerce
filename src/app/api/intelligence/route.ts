import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * Intelligence Analysis API
 * -------------------------
 * Analyzes a discovered product using a specific AI agent. Supports:
 *   - "product-analysis" → Trend/Demand/Competition/Opportunity/Risk scores + financial estimates
 *   - "supplier" → Supplier intelligence (reliability/MOQ/certifications/Trade Assurance/Gold)
 *   - "competitor" → Competitor analysis (pricing/listing/SEO/image quality + gaps)
 *   - "trend" → Trend intelligence (rising/declining/seasonal + confidence score)
 *   - "profit" → Enhanced profit calculation (product cost/shipping/packaging/taxes/fees/ads)
 *   - "decision" → AI decision engine ("Should I sell this?" → go/hold/avoid/pivot)
 *   - "match" → Product matching (cross-marketplace similarity)
 *
 * Each analysis runs through the AI Orchestrator + persists the result to
 * the appropriate table (ProductAnalysis, SupplierReport, CompetitorReport,
 * TrendReport, ProfitCalculation, AiDecision, ProductMatch).
 */

const AnalysisSchema = z.object({
  discoveredProductId: z.string(),
  analysisType: z.enum([
    "product-analysis",
    "supplier",
    "competitor",
    "trend",
    "profit",
    "decision",
    "match",
  ]),
  // Optional inputs for profit analysis
  inputs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  // For matching: the target product ID to compare against
  targetProductId: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = AnalysisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { discoveredProductId, analysisType, inputs, targetProductId } = parsed.data;

  // Load the discovered product
  const product = await db.discoveredProduct.findFirst({
    where: {
      id: discoveredProductId,
      OR: [{ userId: user.id }, { userId: null }],
    },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Build the analysis prompt based on type
  const agentKeyMap: Record<string, string> = {
    "product-analysis": "research",
    supplier: "supplier",
    competitor: "similarity",
    trend: "trend",
    profit: "profit",
    decision: "strategy",
    match: "similarity",
  };
  const agentKey = agentKeyMap[analysisType] || "general";

  const promptBuilder: Record<string, string> = {
    "product-analysis": `Analyze this product for e-commerce viability:
Product: ${product.title}
Description: ${product.description || "N/A"}
Source: ${product.source}
Price: ${product.price ? `${product.price} ${product.currency}` : "N/A"}
Category: ${product.category || "N/A"}
Tags: ${product.tags || "N/A"}

Return a JSON object with these fields:
- trendScore (0-100, higher = stronger trend)
- demandScore (0-100, higher = more demand)
- competitionScore (0-100, higher = MORE competition)
- opportunityScore (0-100, higher = better opportunity)
- riskScore (0-100, higher = MORE risk)
- estimatedMonthlySales (integer)
- estimatedRevenue (number, USD)
- estimatedProfit (number, USD)
- estimatedRoi (number, percentage)
- estimatedMargin (number, percentage)
- suggestedPrice (number, USD)
- averageMarketPrice (number, USD)
- priceRangeMin (number, USD)
- priceRangeMax (number, USD)
- marketSaturation ("low" | "medium" | "high")
- seasonality ("year-round" | "seasonal" | "holiday" | "trending")
- growthPotential ("low" | "medium" | "high")
- reasoning (string: explain WHY the scores were generated)
- recommendations (array of strings: actionable next steps)

Return ONLY valid JSON, no markdown.`,

    supplier: `Analyze the supplier for this product:
Product: ${product.title}
Source: ${product.source}
Supplier metadata: ${product.metadata || "N/A"}

Return a JSON object with:
- supplierName
- supplierType ("manufacturer" | "dropshipper" | "wholesaler")
- country
- moq (integer)
- unitCostMin (number, USD)
- unitCostMax (number, USD)
- leadTimeDays (integer)
- reliabilityScore (0-100)
- tradeAssurance (boolean)
- goldSupplier (boolean)
- yearsInBusiness (integer)
- responseTime (string, e.g. "24h")
- productionCapacity (string)
- certifications (array of strings)
- supplierScore (0-100, composite)
- reasoning (string)
- recommendations (array of strings)

Return ONLY valid JSON.`,

    competitor: `Analyze the competitive landscape for this product:
Product: ${product.title}
Source: ${product.source}
Price: ${product.price || "N/A"}

Return a JSON object with:
- shopName
- shopUrl
- listingUrl
- listingTitle
- listingPrice (number)
- pricingScore (0-100)
- listingQualityScore (0-100)
- seoScore (0-100)
- imageScore (0-100)
- positioning (string)
- marketGaps (array of strings)
- competitiveAdvantages (array of strings)
- weaknesses (array of strings)
- reasoning (string)
- recommendations (array of strings)

Return ONLY valid JSON.`,

    trend: `Analyze the trend for this product/niche:
Product: ${product.title}
Keyword: ${product.title}

Return a JSON object with:
- keyword
- source ("${product.source}")
- momentum ("rising" | "stable" | "declining")
- trendScore (0-100)
- confidenceScore (0-100)
- drivers (array of strings: what's fueling the trend)
- recommendedAction (string)
- seasonality ("year-round" | "seasonal" | "holiday" | "trending")
- exampleProducts (array of strings: 3 product ideas)
- reasoning (string)

Return ONLY valid JSON.`,

    profit: `Calculate profitability for this product with these inputs:
Product: ${product.title}
Inputs: ${JSON.stringify(inputs || {})}

Return a JSON object with:
- totalCost (number)
- totalFees (number)
- netProfit (number)
- grossProfit (number)
- roi (number, percentage)
- margin (number, percentage)
- breakEvenPrice (number)
- breakEvenUnits (integer)
- aiInsight (string: how to improve profitability)
- recommendations (array of strings)

Return ONLY valid JSON.`,

    decision: `Make a business decision for this product:
Product: ${product.title}
Description: ${product.description || "N/A"}
Source: ${product.source}
Price: ${product.price || "N/A"}

Consider: trends, competition, profit potential, supplier availability, ease of sourcing, shipping complexity, Etsy compatibility.

Return a JSON object with:
- verdict ("go" | "hold" | "avoid" | "pivot")
- confidence (0-100)
- reasoning (string: detailed explanation)
- nextAction (string: the single most important next step)

Return ONLY valid JSON.`,

    match: `Compare these two products for cross-marketplace matching:
Source: ${product.title} (${product.source}, $${product.price || "N/A"})
Target ID: ${targetProductId || "N/A"}

Return a JSON object with:
- overallSimilarity (0-100)
- materialSimilarity (0-100)
- designSimilarity (0-100)
- shapeSimilarity (0-100)
- colorSimilarity (0-100)
- patternSimilarity (0-100)
- manufacturingSimilarity (0-100)
- priceDeltaPct (number: percentage difference)
- reasoning (string)

Return ONLY valid JSON.`,
  };

  const analysisPrompt = promptBuilder[analysisType];
  if (!analysisPrompt) {
    return NextResponse.json({ error: "Unknown analysis type" }, { status: 400 });
  }

  try {
    // Run through the AI orchestrator
    const result = await orchestrator.chat({
      userId: user.id,
      agentKey,
      messages: [{ role: "user", content: analysisPrompt }],
    });

    // Parse the JSON response
    let parsed: any = null;
    try {
      // Strip markdown code fences if present
      const cleaned = result.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, return the raw content
      parsed = { rawContent: result.content, parseError: true };
    }

    // Persist to the appropriate table
    let savedRecord: any = null;
    try {
      switch (analysisType) {
        case "product-analysis":
          savedRecord = await db.productAnalysis.create({
            data: {
              userId: user.id,
              discoveredProductId: product.id,
              agentKey,
              trendScore: parsed.trendScore ?? null,
              demandScore: parsed.demandScore ?? null,
              competitionScore: parsed.competitionScore ?? null,
              opportunityScore: parsed.opportunityScore ?? null,
              riskScore: parsed.riskScore ?? null,
              estimatedMonthlySales: parsed.estimatedMonthlySales ?? null,
              estimatedRevenue: parsed.estimatedRevenue ?? null,
              estimatedProfit: parsed.estimatedProfit ?? null,
              estimatedRoi: parsed.estimatedRoi ?? null,
              estimatedMargin: parsed.estimatedMargin ?? null,
              suggestedPrice: parsed.suggestedPrice ?? null,
              averageMarketPrice: parsed.averageMarketPrice ?? null,
              priceRangeMin: parsed.priceRangeMin ?? null,
              priceRangeMax: parsed.priceRangeMax ?? null,
              marketSaturation: parsed.marketSaturation ?? null,
              seasonality: parsed.seasonality ?? null,
              growthPotential: parsed.growthPotential ?? null,
              reasoning: parsed.reasoning ?? null,
              recommendations: parsed.recommendations
                ? JSON.stringify(parsed.recommendations)
                : null,
              metadata: JSON.stringify({
                model: result.model,
                tokensIn: result.tokensIn,
                tokensOut: result.tokensOut,
                latencyMs: result.latencyMs,
              }),
            },
          });
          break;
        case "supplier":
          savedRecord = await db.supplierReport.create({
            data: {
              userId: user.id,
              discoveredProductId: product.id,
              source: product.source,
              supplierName: parsed.supplierName ?? null,
              supplierUrl: parsed.supplierUrl ?? null,
              supplierType: parsed.supplierType ?? null,
              country: parsed.country ?? null,
              moq: parsed.moq ?? null,
              unitCostMin: parsed.unitCostMin ?? null,
              unitCostMax: parsed.unitCostMax ?? null,
              leadTimeDays: parsed.leadTimeDays ?? null,
              reliabilityScore: parsed.reliabilityScore ?? null,
              tradeAssurance: parsed.tradeAssurance ?? false,
              goldSupplier: parsed.goldSupplier ?? false,
              yearsInBusiness: parsed.yearsInBusiness ?? null,
              responseTime: parsed.responseTime ?? null,
              productionCapacity: parsed.productionCapacity ?? null,
              certifications: parsed.certifications
                ? JSON.stringify(parsed.certifications)
                : null,
              supplierScore: parsed.supplierScore ?? null,
              reasoning: parsed.reasoning ?? null,
              recommendations: parsed.recommendations
                ? JSON.stringify(parsed.recommendations)
                : null,
              metadata: JSON.stringify({
                model: result.model,
                tokensIn: result.tokensIn,
                tokensOut: result.tokensOut,
                latencyMs: result.latencyMs,
              }),
            },
          });
          break;
        case "competitor":
          savedRecord = await db.competitorReport.create({
            data: {
              userId: user.id,
              discoveredProductId: product.id,
              shopName: parsed.shopName ?? null,
              shopUrl: parsed.shopUrl ?? null,
              listingUrl: parsed.listingUrl ?? null,
              listingTitle: parsed.listingTitle ?? null,
              listingPrice: parsed.listingPrice ?? null,
              listingImage: parsed.listingImage ?? null,
              pricingScore: parsed.pricingScore ?? null,
              listingQualityScore: parsed.listingQualityScore ?? null,
              seoScore: parsed.seoScore ?? null,
              imageScore: parsed.imageScore ?? null,
              positioning: parsed.positioning ?? null,
              marketGaps: parsed.marketGaps
                ? JSON.stringify(parsed.marketGaps)
                : null,
              competitiveAdvantages: parsed.competitiveAdvantages
                ? JSON.stringify(parsed.competitiveAdvantages)
                : null,
              weaknesses: parsed.weaknesses
                ? JSON.stringify(parsed.weaknesses)
                : null,
              reasoning: parsed.reasoning ?? null,
              recommendations: parsed.recommendations
                ? JSON.stringify(parsed.recommendations)
                : null,
              metadata: JSON.stringify({
                model: result.model,
                tokensIn: result.tokensIn,
                tokensOut: result.tokensOut,
                latencyMs: result.latencyMs,
              }),
            },
          });
          break;
        case "trend":
          savedRecord = await db.trendReport.create({
            data: {
              userId: user.id,
              keyword: product.title,
              source: product.source,
              momentum: parsed.momentum ?? "stable",
              trendScore: parsed.trendScore ?? null,
              confidenceScore: parsed.confidenceScore ?? null,
              drivers: parsed.drivers ? JSON.stringify(parsed.drivers) : null,
              recommendedAction: parsed.recommendedAction ?? null,
              seasonality: parsed.seasonality ?? null,
              exampleProducts: parsed.exampleProducts
                ? JSON.stringify(parsed.exampleProducts)
                : null,
              reasoning: parsed.reasoning ?? null,
              metadata: JSON.stringify({
                model: result.model,
                tokensIn: result.tokensIn,
                tokensOut: result.tokensOut,
                latencyMs: result.latencyMs,
              }),
            },
          });
          break;
        case "profit":
          savedRecord = await db.profitCalculation.create({
            data: {
              userId: user.id,
              discoveredProductId: product.id,
              productCost: Number(inputs?.productCost || product.price || 0),
              shippingCost: Number(inputs?.shippingCost || 0),
              packagingCost: Number(inputs?.packagingCost || 0),
              taxPct: Number(inputs?.taxPct || 0),
              marketplaceFeePct: Number(inputs?.marketplaceFeePct || 0),
              paymentFeePct: Number(inputs?.paymentFeePct || 0),
              advertisingCost: Number(inputs?.advertisingCost || 0),
              discountPct: Number(inputs?.discountPct || 0),
              currency: String(inputs?.currency || "USD"),
              suggestedPrice: Number(inputs?.suggestedPrice || product.price || 0),
              totalCost: parsed.totalCost ?? null,
              totalFees: parsed.totalFees ?? null,
              netProfit: parsed.netProfit ?? null,
              grossProfit: parsed.grossProfit ?? null,
              roi: parsed.roi ?? null,
              margin: parsed.margin ?? null,
              breakEvenPrice: parsed.breakEvenPrice ?? null,
              breakEvenUnits: parsed.breakEvenUnits ?? null,
              aiInsight: parsed.aiInsight ?? null,
              recommendations: parsed.recommendations
                ? JSON.stringify(parsed.recommendations)
                : null,
            },
          });
          break;
        case "decision":
          savedRecord = await db.aiDecision.create({
            data: {
              userId: user.id,
              discoveredProductId: product.id,
              verdict: parsed.verdict ?? "hold",
              confidence: parsed.confidence ?? null,
              reasoning: parsed.reasoning ?? null,
              nextAction: parsed.nextAction ?? null,
              metadata: JSON.stringify({
                model: result.model,
                tokensIn: result.tokensIn,
                tokensOut: result.tokensOut,
                latencyMs: result.latencyMs,
              }),
            },
          });
          break;
        case "match":
          if (targetProductId) {
            savedRecord = await db.productMatch.create({
              data: {
                userId: user.id,
                sourceProductId: product.id,
                targetProductId,
                overallSimilarity: parsed.overallSimilarity ?? null,
                materialSimilarity: parsed.materialSimilarity ?? null,
                designSimilarity: parsed.designSimilarity ?? null,
                shapeSimilarity: parsed.shapeSimilarity ?? null,
                colorSimilarity: parsed.colorSimilarity ?? null,
                patternSimilarity: parsed.patternSimilarity ?? null,
                manufacturingSimilarity: parsed.manufacturingSimilarity ?? null,
                priceDeltaPct: parsed.priceDeltaPct ?? null,
                reasoning: parsed.reasoning ?? null,
                recommendations: parsed.recommendations
                  ? JSON.stringify(parsed.recommendations)
                  : null,
                metadata: JSON.stringify({
                  model: result.model,
                  tokensIn: result.tokensIn,
                  tokensOut: result.tokensOut,
                  latencyMs: result.latencyMs,
                }),
              },
            });
          }
          break;
      }
    } catch (dbErr) {
      logger.error("api", "Failed to persist analysis", { error: String(dbErr) });
    }

    await logger.audit({
      userId: user.id,
      action: `intelligence.${analysisType}`,
      category: "ai",
      resourceId: product.id,
      metadata: {
        agentKey,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
      },
    });

    return NextResponse.json({
      analysis: parsed,
      savedRecordId: savedRecord?.id || null,
      meta: {
        agentKey,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
      },
    });
  } catch (err: any) {
    logger.error("api", "Intelligence analysis failed", { error: String(err) });
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET — list previously-run analyses for the user.
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "product-analysis";
  const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);

  const products = await db.discoveredProduct.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      supplierReports: { orderBy: { createdAt: "desc" }, take: 1 },
      competitorReports: { orderBy: { createdAt: "desc" }, take: 1 },
      aiDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
      profitCalculations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({ products });
}
