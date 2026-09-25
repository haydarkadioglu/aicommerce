import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { z } from "zod";

const SeoSchema = z.object({
  listingId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  marketplace: z.string().default("etsy"),
});

/**
 * SEO Engine — analyzes a listing and returns:
 *   - SEO Score (0-100)
 *   - Keyword Density (map of keyword → density %)
 *   - Missing Keywords (array)
 *   - Optimization Suggestions (array)
 *   - Readability Score (0-100)
 *   - Search Visibility Estimate (0-100)
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = SeoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  // Load listing from DB if listingId provided
  let listingData: any = null;
  if (parsed.data.listingId) {
    listingData = await db.listing.findFirst({
      where: {
        id: parsed.data.listingId,
        OR: [{ userId: user.id }, { userId: null }],
      },
    });
    if (!listingData) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
  }

  const title = parsed.data.title || listingData?.title || "";
  const description =
    parsed.data.description || listingData?.description || "";
  const tags = parsed.data.tags ||
    (listingData?.tags ? safeParse(listingData.tags) : []);
  const keywords = parsed.data.keywords ||
    (listingData?.keywords ? safeParse(listingData.keywords) : []);
  const marketplace = parsed.data.marketplace || listingData?.marketplace || "etsy";

  if (!title && !description) {
    return NextResponse.json(
      { error: "Title or description required" },
      { status: 400 }
    );
  }

  const prompt = `Analyze the SEO quality of this ${marketplace} listing:

Title: ${title}
Description: ${description}
Tags: ${tags.join(", ")}
Keywords: ${keywords.join(", ")}

Return a JSON object with:
- seoScore (0-100, overall SEO quality)
- keywordDensity (object: map of each keyword to its density percentage in the text)
- missingKeywords (array of high-value keywords that are missing or underused)
- suggestions (array of strings: specific optimization steps)
- readabilityScore (0-100)
- searchVisibilityEstimate (0-100, estimated search visibility)

Return ONLY valid JSON.`;

  try {
    const result = await orchestrator.chat({
      userId: user.id,
      agentKey: "seo",
      messages: [{ role: "user", content: prompt }],
    });

    // Parse the JSON response
    let analysis: any = null;
    try {
      const cleaned = result.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = { rawContent: result.content, parseError: true };
    }

    // Persist to SeoAnalysis table (if we have a listingId)
    let seoAnalysisId: string | null = null;
    if (parsed.data.listingId && !analysis.parseError) {
      try {
        const saved = await db.seoAnalysis.create({
          data: {
            listingId: parsed.data.listingId,
            seoScore: analysis.seoScore ?? null,
            keywordDensity: analysis.keywordDensity
              ? JSON.stringify(analysis.keywordDensity)
              : null,
            missingKeywords: analysis.missingKeywords
              ? JSON.stringify(analysis.missingKeywords)
              : null,
            readabilityScore: analysis.readabilityScore ?? null,
            searchVisibilityEstimate: analysis.searchVisibilityEstimate ?? null,
            suggestions: analysis.suggestions
              ? JSON.stringify(analysis.suggestions)
              : null,
            metadata: JSON.stringify({
              model: result.model,
              tokensIn: result.tokensIn,
              tokensOut: result.tokensOut,
              latencyMs: result.latencyMs,
            }),
          },
        });
        seoAnalysisId = saved.id;

        // Also update the listing's seoScore
        if (analysis.seoScore) {
          await db.listing.update({
            where: { id: parsed.data.listingId },
            data: { seoScore: analysis.seoScore },
          });
        }
      } catch (dbErr) {
        logger.error("api", "Failed to persist SEO analysis", { error: String(dbErr) });
      }
    }

    await logger.audit({
      userId: user.id,
      action: "seo.analyze",
      category: "ai",
      resourceId: parsed.data.listingId || undefined,
      metadata: {
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
      },
    });

    return NextResponse.json({
      analysis,
      seoAnalysisId,
      meta: {
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
      },
    });
  } catch (err: any) {
    logger.error("api", "SEO analysis failed", { error: String(err) });
    return NextResponse.json(
      { error: "SEO analysis failed. Please try again." },
      { status: 500 }
    );
  }
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}
