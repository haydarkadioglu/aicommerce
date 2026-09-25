import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ForecastSchema = z.object({ discoveredProductId: z.string().optional(), period: z.enum(["monthly", "quarterly", "yearly"]).default("monthly") });

/**
 * Profit Forecast — forecasts monthly/quarterly/yearly profit with
 * best-case, expected, and worst-case scenarios. Shows assumptions.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = ForecastSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  let productContext = "General e-commerce product";
  if (parsed.data.discoveredProductId) {
    const p = await db.discoveredProduct.findFirst({ where: { id: parsed.data.discoveredProductId, OR: [{ userId: user.id }, { userId: null }] }, include: { profitCalculations: { orderBy: { createdAt: "desc" }, take: 1 }, analyses: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (p) {
      const profit = p.profitCalculations[0];
      const analysis = p.analyses[0];
      productContext = `Product: ${p.title}, Price: ${p.price || "N/A"}, Net Profit: ${profit?.netProfit || "N/A"}, Margin: ${profit?.margin || "N/A"}%, Est. Monthly Sales: ${analysis?.estimatedMonthlySales || "N/A"}`;
    }
  }

  const prompt = `You are a profit forecaster. Based on: ${productContext}

Forecast ${parsed.data.period} profit. Return JSON:
{
  "bestCaseProfit": number,
  "expectedCaseProfit": number,
  "worstCaseProfit": number,
  "bestCaseRevenue": number,
  "expectedCaseRevenue": number,
  "worstCaseRevenue": number,
  "assumptions": ["array of assumption strings that explain the forecast"],
  "seasonalFactors": { "month1": factor, ... } (12 months, factor 0.5-1.5),
  "aiInsight": "string: key insight about the forecast",
  "recommendations": ["array of actionable steps to maximize profit"]
}

Return ONLY valid JSON.`;

  try {
    const result = await orchestrator.chat({ userId: user.id, agentKey: "profit", messages: [{ role: "user", content: prompt }] });
    let forecast: any = null;
    try { forecast = JSON.parse(result.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { forecast = { rawContent: result.content, parseError: true }; }

    const saved = await db.profitForecast.create({ data: { userId: user.id, discoveredProductId: parsed.data.discoveredProductId || null, period: parsed.data.period, bestCaseProfit: forecast.bestCaseProfit ?? null, expectedCaseProfit: forecast.expectedCaseProfit ?? null, worstCaseProfit: forecast.worstCaseProfit ?? null, bestCaseRevenue: forecast.bestCaseRevenue ?? null, expectedCaseRevenue: forecast.expectedCaseRevenue ?? null, worstCaseRevenue: forecast.worstCaseRevenue ?? null, assumptions: forecast.assumptions ? JSON.stringify(forecast.assumptions) : null, seasonalFactors: forecast.seasonalFactors ? JSON.stringify(forecast.seasonalFactors) : null, aiInsight: forecast.aiInsight || null, recommendations: forecast.recommendations ? JSON.stringify(forecast.recommendations) : null } });

    await logger.audit({ userId: user.id, action: "profit.forecast", category: "ai", resourceId: parsed.data.discoveredProductId || undefined, metadata: { period: parsed.data.period, model: result.model } });
    return NextResponse.json({ forecast, forecastId: saved.id, meta: { model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: result.latencyMs } });
  } catch (err: any) {
    logger.error("api", "Profit forecast failed", { error: String(err) });
    return NextResponse.json({ error: "Forecast failed" }, { status: 500 });
  }
}
