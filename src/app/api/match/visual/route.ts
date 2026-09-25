import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { searchAcrossConnectors } from "@/lib/connectors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const VisualMatchSchema = z.object({
  query: z.string().min(2).max(500),
  imageUrl: z.string().url().optional(),
  sources: z.array(z.string()).optional(),
  limit: z.number().int().min(3).max(15).default(8),
});

/**
 * Visual Product Matching — accepts an image URL or marketplace URL,
 * searches for visually similar products across marketplaces, and
 * estimates similarity based on shape, material, pattern, texture,
 * color, style, and overall appearance.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = VisualMatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Search across connectors for similar products
  const searchResults = await searchAcrossConnectors(
    { mode: "keyword", query: parsed.data.query, imageUrl: parsed.data.imageUrl, limit: parsed.data.limit },
    parsed.data.sources
  );

  // Use AI to compute visual similarity scores
  const prompt = `You are a visual product matching AI. Compare this query product against discovered products.

Query: "${parsed.data.query}"
${parsed.data.imageUrl ? `Query image URL: ${parsed.data.imageUrl}` : ""}

Discovered products:
${searchResults.map((p, i) => `${i + 1}. ${p.title} (${p.source}, $${p.price || "N/A"})`).join("\n")}

Return a JSON array of matches where each item has:
{
  "productTitle": "string",
  "productSource": "string",
  "overallSimilarity": 0-100,
  "shapeSimilarity": 0-100,
  "materialSimilarity": 0-100,
  "patternSimilarity": 0-100,
  "colorSimilarity": 0-100,
  "styleSimilarity": 0-100,
  "confidence": 0-100,
  "reasoning": "why this is/isn't a good visual match"
}

Return ONLY a valid JSON array.`;

  try {
    const result = await orchestrator.chat({ userId: user.id, agentKey: "similarity", messages: [{ role: "user", content: prompt }] });
    let matches: any[] = [];
    try { matches = JSON.parse(result.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { matches = []; }

    await logger.audit({ userId: user.id, action: "match.visual", category: "ai", metadata: { query: parsed.data.query.slice(0, 100), matchesFound: matches.length, model: result.model } });
    return NextResponse.json({ matches, meta: { model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: result.latencyMs } });
  } catch (err: any) {
    logger.error("api", "Visual match failed", { error: String(err) });
    return NextResponse.json({ error: "Visual matching failed" }, { status: 500 });
  }
}
