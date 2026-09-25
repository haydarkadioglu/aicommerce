import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { z } from "zod";

const GapSchema = z.object({ keyword: z.string().min(2).max(200) });

/**
 * Market Gap Detector — identifies missing opportunities in a niche.
 * Detects: high demand + few sellers, weak listings, poor photography,
 * poor SEO, missing styles/colors/personalization.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = GapSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const prompt = `You are a market gap detector for e-commerce. Analyze the niche: "${parsed.data.keyword}".

Identify missing opportunities. Return a JSON array of gaps where each item has:
{
  "gapType": "high-demand-few-sellers" | "weak-listings" | "poor-photography" | "poor-seo" | "missing-styles" | "missing-colors" | "missing-personalization",
  "gapTitle": "short title",
  "gapDescription": "what's missing and why it matters",
  "opportunityScore": 0-100,
  "confidence": 0-100,
  "aiSummary": "1-2 sentence summary",
  "recommendedAction": "what the user should do",
  "risks": ["array of risk strings"]
}

Return 3-7 gaps. Return ONLY a valid JSON array.`;

  try {
    const result = await orchestrator.chat({ userId: user.id, agentKey: "research", messages: [{ role: "user", content: prompt }] });
    let gaps: any[] = [];
    try { gaps = JSON.parse(result.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { gaps = []; }

    const saved = await Promise.all(gaps.slice(0, 7).map(g => db.marketGap.create({ data: { userId: user.id, keyword: parsed.data.keyword, gapType: g.gapType || "weak-listings", gapTitle: g.gapTitle || "Unknown gap", gapDescription: g.gapDescription || null, opportunityScore: g.opportunityScore ?? null, confidence: g.confidence ?? null, aiSummary: g.aiSummary || null, recommendedAction: g.recommendedAction || null, risks: g.risks ? JSON.stringify(g.risks) : null } }).catch(() => null)));

    await logger.audit({ userId: user.id, action: "gaps.detect", category: "ai", metadata: { keyword: parsed.data.keyword, gapsFound: gaps.length, model: result.model } });
    return NextResponse.json({ gaps: gaps.map((g, i) => ({ ...g, dbId: saved[i]?.id || null })), meta: { model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: result.latencyMs } });
  } catch (err: any) {
    logger.error("api", "Gap detection failed", { error: String(err) });
    return NextResponse.json({ error: "Gap detection failed" }, { status: 500 });
  }
}
