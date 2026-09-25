import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { z } from "zod";

const AdvisorSchema = z.object({
  discoveredProductId: z.string().optional(),
  question: z.string().min(5).max(1000),
  context: z.record(z.string(), z.unknown()).optional(),
});

/**
 * AI Business Advisor — combines outputs from every AI agent and produces
 * a single actionable recommendation. Answers questions like:
 *   "Should I launch this product?"
 *   "Is the market becoming saturated?"
 *   "Should I change supplier?"
 *   "Should I raise price?"
 *
 * Every recommendation includes:
 *   - Verdict (go | hold | avoid | pivot)
 *   - Confidence score (0-100)
 *   - Reasoning
 *   - Advantages
 *   - Disadvantages
 *   - Risks
 *   - Suggested next actions
 *   - Business explanation (plain-English summary)
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = AdvisorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  // Gather all available intelligence for the product (if provided)
  let intelligenceContext = "";
  if (parsed.data.discoveredProductId) {
    const product = await db.discoveredProduct.findFirst({
      where: {
        id: parsed.data.discoveredProductId,
        OR: [{ userId: user.id }, { userId: null }],
      },
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 3 },
        supplierReports: { orderBy: { createdAt: "desc" }, take: 1 },
        competitorReports: { orderBy: { createdAt: "desc" }, take: 1 },
        profitCalculations: { orderBy: { createdAt: "desc" }, take: 1 },
        aiDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (product) {
      const parts: string[] = [
        `Product: ${product.title}`,
        `Source: ${product.source}`,
        `Price: ${product.price ? `$${product.price} ${product.currency}` : "N/A"}`,
      ];
      if (product.analyses.length > 0) {
        const a = product.analyses[0];
        parts.push(
          `Product Analysis: Trend=${a.trendScore}, Demand=${a.demandScore}, Competition=${a.competitionScore}, Opportunity=${a.opportunityScore}, Risk=${a.riskScore}`
        );
        if (a.estimatedRevenue) parts.push(`Est. Revenue: $${a.estimatedRevenue}`);
        if (a.estimatedProfit) parts.push(`Est. Profit: $${a.estimatedProfit}`);
      }
      if (product.supplierReports.length > 0) {
        const s = product.supplierReports[0];
        parts.push(
          `Supplier: ${s.supplierName || "N/A"}, MOQ=${s.moq}, Score=${s.supplierScore}, Trade Assurance=${s.tradeAssurance}, Gold=${s.goldSupplier}`
        );
      }
      if (product.competitorReports.length > 0) {
        const c = product.competitorReports[0];
        parts.push(
          `Competitor: Shop=${c.shopName}, Pricing Score=${c.pricingScore}, SEO Score=${c.seoScore}`
        );
      }
      if (product.profitCalculations.length > 0) {
        const p = product.profitCalculations[0];
        parts.push(
          `Profit: Net=$${p.netProfit}, Margin=${p.margin}%, ROI=${p.roi}%`
        );
      }
      intelligenceContext = parts.join("\n");
    }
  }

  const prompt = `You are the AI Business Advisor for an e-commerce commerce operating system.

The user asks: "${parsed.data.question}"

${intelligenceContext ? `Available intelligence:\n${intelligenceContext}` : "No specific product data available — answer based on general e-commerce knowledge."}

Provide a comprehensive business recommendation. Return a JSON object with:
{
  "verdict": "go" | "hold" | "avoid" | "pivot",
  "confidence": 0-100,
  "reasoning": "detailed explanation of WHY this verdict",
  "advantages": ["array of advantages of proceeding"],
  "disadvantages": ["array of disadvantages"],
  "risks": ["array of risks to watch"],
  "nextActions": ["array of concrete next steps"],
  "businessExplanation": "plain-English summary for a non-technical business owner"
}

Return ONLY valid JSON.`;

  try {
    const result = await orchestrator.chat({
      userId: user.id,
      agentKey: "strategy",
      messages: [{ role: "user", content: prompt }],
    });

    let advice: any = null;
    try {
      const cleaned = result.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      advice = JSON.parse(cleaned);
    } catch {
      advice = { rawContent: result.content, parseError: true };
    }

    await logger.audit({
      userId: user.id,
      action: "advisor.consult",
      category: "ai",
      resourceId: parsed.data.discoveredProductId || undefined,
      metadata: {
        question: parsed.data.question.slice(0, 200),
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
      },
    });

    return NextResponse.json({
      advice,
      meta: {
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
      },
    });
  } catch (err: any) {
    logger.error("api", "Advisor failed", { error: String(err) });
    return NextResponse.json(
      { error: "Advisor analysis failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET — list past advisor consultations.
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Return recent AI decisions as advisor history
  const decisions = await db.aiDecision.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      discoveredProduct: {
        select: { title: true, source: true, price: true },
      },
    },
  });
  return NextResponse.json({ consultations: decisions });
}
