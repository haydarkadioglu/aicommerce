import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { searchAcrossConnectors } from "@/lib/connectors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CompareSchema = z.object({
  keyword: z.string().min(2).max(200),
  limit: z.number().int().min(2).max(10).default(5),
});

/**
 * Advanced Supplier Comparison — compares multiple suppliers for a keyword
 * across price, MOQ, lead time, shipping, certifications, factory history,
 * reliability, reviews, production capacity, Trade Assurance, response quality.
 * Recommends the best supplier.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = CompareSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const suppliers = await searchAcrossConnectors(
    { mode: "keyword", query: parsed.data.keyword, limit: parsed.data.limit },
    ["alibaba", "1688"]
  );

  const prompt = `Compare these suppliers for "${parsed.data.keyword}":

${suppliers.map((s, i) => `${i + 1}. ${s.title} (${s.source}, $${s.price || "N/A"})
   MOQ: ${s.metadata?.moq || "N/A"}, Trade Assurance: ${s.metadata?.tradeAssurance || "N/A"}, Gold: ${s.metadata?.goldSupplier || "N/A"}, Years: ${s.metadata?.yearsInBusiness || "N/A"}, Lead: ${s.metadata?.leadTimeDays || "N/A"}d`).join("\n\n")}

Compare them using: price, MOQ, lead time, shipping, certifications, factory history, reliability, reviews, production capacity, Trade Assurance, response quality.

Return JSON:
{
  "suppliers": [array of { name, source, price, moq, leadTimeDays, reliabilityScore(0-100), tradeAssurance, goldSupplier, yearsInBusiness, productionCapacity, certifications, responseTime, supplierScore(0-100), pros[], cons[] }],
  "bestSupplierId": "index of best (0-based)",
  "bestSupplierName": "string",
  "reasoning": "why this is the best",
  "recommendations": ["actionable steps"]
}

Return ONLY valid JSON.`;

  try {
    const result = await orchestrator.chat({ userId: user.id, agentKey: "supplier", messages: [{ role: "user", content: prompt }] });
    let comparison: any = null;
    try { comparison = JSON.parse(result.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { comparison = { rawContent: result.content, parseError: true }; }

    const saved = await db.supplierComparison.create({ data: { userId: user.id, keyword: parsed.data.keyword, suppliers: JSON.stringify(comparison.suppliers || []), bestSupplierId: String(comparison.bestSupplierId ?? ""), bestSupplierName: comparison.bestSupplierName || "", reasoning: comparison.reasoning || "", recommendations: JSON.stringify(comparison.recommendations || []) } });

    await logger.audit({ userId: user.id, action: "suppliers.compare", category: "ai", metadata: { keyword: parsed.data.keyword, model: result.model } });
    return NextResponse.json({ comparison, comparisonId: saved.id, meta: { model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: result.latencyMs } });
  } catch (err: any) {
    logger.error("api", "Supplier comparison failed", { error: String(err) });
    return NextResponse.json({ error: "Comparison failed" }, { status: 500 });
  }
}
