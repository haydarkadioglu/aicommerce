import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { z } from "zod";

const GenerateListingSchema = z.object({
  discoveredProductId: z.string().optional(),
  productId: z.string().optional(), // existing project product
  marketplace: z.string().default("etsy"),
  productContext: z.string().optional(),
  // What to generate
  generate: z.array(z.string()).default([
    "title",
    "description",
    "bulletPoints",
    "highlights",
    "tags",
    "keywords",
    "materials",
    "colors",
    "style",
    "room",
    "occasion",
    "holiday",
    "personalization",
    "metaDescription",
  ]),
  // Content tools (for existing listings)
  action: z.enum(["generate", "rewrite", "expand", "shorten", "translate", "tone", "variations", "optimize"]).default("generate"),
  existingContent: z.string().optional(),
  targetLanguage: z.string().optional(),
  tone: z.string().optional(),
});

/**
 * AI Listing Studio — generates or transforms full marketplace-ready listings.
 *
 * Actions:
 *   - "generate"  → create a new listing from scratch
 *   - "rewrite"   → rewrite an existing listing in different words
 *   - "expand"    → make an existing listing longer/more detailed
 *   - "shorten"   → make an existing listing more concise
 *   - "translate" → translate to targetLanguage
 *   - "tone"      → adjust tone (professional, casual, luxury, etc.)
 *   - "variations" → generate multiple variations
 *   - "optimize"  → optimize for SEO + readability
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "ai:chat")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = GenerateListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  // Gather product context
  let productContext = parsed.data.productContext || "";
  let discoveredProductId = parsed.data.discoveredProductId;
  if (discoveredProductId) {
    const dp = await db.discoveredProduct.findFirst({
      where: {
        id: discoveredProductId,
        OR: [{ userId: user.id }, { userId: null }],
      },
    });
    if (dp) {
      productContext = [
        `Title: ${dp.title}`,
        dp.description ? `Description: ${dp.description}` : "",
        dp.category ? `Category: ${dp.category}` : "",
        dp.price ? `Price: ${dp.price} ${dp.currency}` : "",
        dp.tags ? `Tags: ${dp.tags}` : "",
        dp.materials ? `Materials: ${dp.materials}` : "",
        `Source: ${dp.source}`,
      ].filter(Boolean).join("\n");
    }
  } else if (parsed.data.productId) {
    const p = await db.product.findUnique({
      where: { id: parsed.data.productId },
      include: { project: true },
    });
    if (p && p.project.userId === user.id) {
      productContext = [
        `Title: ${p.title}`,
        p.description ? `Description: ${p.description}` : "",
        p.category ? `Category: ${p.category}` : "",
        p.price ? `Price: ${p.price} ${p.currency}` : "",
        p.tags ? `Tags: ${p.tags}` : "",
      ].filter(Boolean).join("\n");
    }
  }

  if (!productContext && !parsed.data.existingContent) {
    return NextResponse.json(
      { error: "No product context or existing content provided" },
      { status: 400 }
    );
  }

  // Build the AI prompt based on action
  const fields = parsed.data.generate.join(", ");
  let prompt = "";

  switch (parsed.data.action) {
    case "generate":
      prompt = `Generate a complete marketplace listing for ${parsed.data.marketplace}.

Product context:
${productContext}

Generate these fields: ${fields}

Return a JSON object with:
- title (string, SEO-optimized, under 140 chars)
- description (string, markdown-formatted, 150-300 words)
- bulletPoints (array of strings, 5 items, each under 80 chars)
- highlights (array of strings, 3 key selling points)
- tags (array of strings, 13 items, each under 20 chars)
- keywords (array of strings, 10 long-tail keywords)
- materials (array of strings)
- colors (array of strings)
- style (string, e.g. "minimalist", "boho", "rustic")
- room (string, e.g. "living room", "kitchen")
- occasion (string, e.g. "housewarming", "wedding")
- holiday (string, e.g. "Christmas", "Mother's Day", or "none")
- personalization (string describing personalization options, or "none")
- metaDescription (string, under 160 chars)

Return ONLY valid JSON.`;
      break;
    case "rewrite":
      prompt = `Rewrite this listing content in different words while keeping the same meaning and SEO keywords:

${parsed.data.existingContent}

Return the rewritten content as markdown. Keep it the same length.`;
      break;
    case "expand":
      prompt = `Expand this listing content with more detail, benefits, and use cases:

${parsed.data.existingContent}

Return the expanded content as markdown (50% longer).`;
      break;
    case "shorten":
      prompt = `Shorten this listing content to be more concise and punchy:

${parsed.data.existingContent}

Return the shortened content as markdown (50% shorter).`;
      break;
    case "translate":
      prompt = `Translate this listing content to ${parsed.data.targetLanguage || "Spanish"}:

${parsed.data.existingContent}

Return the translated content as markdown.`;
      break;
    case "tone":
      prompt = `Adjust the tone of this listing to be ${parsed.data.tone || "professional"}:

${parsed.data.existingContent}

Return the adjusted content as markdown.`;
      break;
    case "variations":
      prompt = `Generate 3 variations of this listing content:

${parsed.data.existingContent}

Return a JSON array of 3 strings, each a different variation. Return ONLY valid JSON.`;
      break;
    case "optimize":
      prompt = `Optimize this listing content for SEO and readability:

${parsed.data.existingContent}

Return the optimized content as markdown. Add keyword-rich phrases naturally.`;
      break;
  }

  try {
    const result = await orchestrator.chat({
      userId: user.id,
      agentKey: "listing",
      messages: [{ role: "user", content: prompt }],
    });

    // Parse JSON for "generate" action
    let listingData: any = null;
    if (parsed.data.action === "generate") {
      try {
        const cleaned = result.content
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        listingData = JSON.parse(cleaned);
      } catch {
        listingData = { rawContent: result.content, parseError: true };
      }
    }

    // Persist to Listing table
    let listingId: string | null = null;
    try {
      const listing = await db.listing.create({
        data: {
          userId: user.id,
          discoveredProductId: discoveredProductId || null,
          marketplace: parsed.data.marketplace,
          title: listingData?.title || null,
          description: listingData?.description || (parsed.data.action !== "generate" ? result.content : null),
          bulletPoints: listingData?.bulletPoints ? JSON.stringify(listingData.bulletPoints) : null,
          highlights: listingData?.highlights ? JSON.stringify(listingData.highlights) : null,
          tags: listingData?.tags ? JSON.stringify(listingData.tags) : null,
          keywords: listingData?.keywords ? JSON.stringify(listingData.keywords) : null,
          materials: listingData?.materials ? JSON.stringify(listingData.materials) : null,
          colors: listingData?.colors ? JSON.stringify(listingData.colors) : null,
          style: listingData?.style || null,
          room: listingData?.room || null,
          occasion: listingData?.occasion || null,
          holiday: listingData?.holiday || null,
          personalization: listingData?.personalization || null,
          metaDescription: listingData?.metaDescription || null,
          model: result.model,
          provider: result.provider,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          latencyMs: result.latencyMs,
          version: 1,
          isCurrent: true,
          metadata: JSON.stringify({ action: parsed.data.action }),
        },
      });
      listingId = listing.id;
    } catch (dbErr) {
      logger.error("api", "Failed to persist listing", { error: String(dbErr) });
    }

    await logger.audit({
      userId: user.id,
      action: `listing.${parsed.data.action}`,
      category: "ai",
      resourceId: listingId || undefined,
      metadata: {
        marketplace: parsed.data.marketplace,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
      },
    });

    return NextResponse.json({
      listing: listingData,
      rawContent: parsed.data.action !== "generate" ? result.content : undefined,
      listingId,
      meta: {
        action: parsed.data.action,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
      },
    });
  } catch (err: any) {
    logger.error("api", "Listing generation failed", { error: String(err) });
    return NextResponse.json(
      { error: "Listing generation failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET — list user's saved listings.
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);

  const listings = await db.listing.findMany({
    where: { userId: user.id, isCurrent: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      _count: { select: { seoAnalyses: true, mediaAssets: true } },
    },
  });

  return NextResponse.json({ listings });
}
