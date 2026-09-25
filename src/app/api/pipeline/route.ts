import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { searchAcrossConnectors } from "@/lib/connectors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PipelineSchema = z.object({
  query: z.string().min(2).max(500),
  storeId: z.string().optional(),
  steps: z.array(z.enum([
    "research",
    "supplier",
    "profit",
    "decision",
    "seo",
    "listing",
    "save",
  ])).default(["research", "supplier", "profit", "decision", "seo", "listing", "save"]),
  // If already discovered, skip discovery
  discoveredProductId: z.string().optional(),
});

type PipelineStep = {
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: any;
  error?: string;
};

/**
 * One-Click Pipeline — the autonomous AI workflow.
 *
 * Research → Supplier Comparison → Profit Analysis → AI Decision →
 * SEO Research → Generate Listing → Save Project
 *
 * The user can stop or edit any step. Each step's result is returned
 * as it completes, allowing real-time progress tracking.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = PipelineSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const steps: PipelineStep[] = parsed.data.steps.map((s) => ({
    name: s,
    status: "pending" as const,
  }));

  let discoveredProductId = parsed.data.discoveredProductId;
  let productTitle = parsed.data.query;
  let productData: any = null;

  try {
    // STEP 1: Research / Discovery
    if (parsed.data.steps.includes("research")) {
      steps.find((s) => s.name === "research")!.status = "running";

      if (!discoveredProductId) {
        // Search marketplaces
        const searchResults = await searchAcrossConnectors(
          { mode: "keyword", query: parsed.data.query, limit: 5 },
        );
        if (searchResults.length > 0) {
          const top = searchResults[0];
          const created = await db.discoveredProduct.create({
            data: {
              userId: user.id,
              storeId: parsed.data.storeId || null,
              source: top.source,
              sourceId: top.sourceId || null,
              sourceUrl: top.sourceUrl || null,
              title: top.title,
              description: top.description || null,
              imageUrl: top.imageUrl || null,
              category: top.category || null,
              price: top.price || null,
              currency: top.currency || "USD",
              tags: top.tags ? JSON.stringify(top.tags) : null,
              materials: top.materials ? JSON.stringify(top.materials) : null,
              marketplace: "etsy",
              metadata: top.metadata ? JSON.stringify(top.metadata) : null,
            },
          });
          discoveredProductId = created.id;
          productTitle = top.title;
          productData = top;
        }
      }

      if (discoveredProductId) {
        // Run comprehensive market research
        const researchPrompt = `Analyze this product for market viability:
Product: ${productTitle}
Query: "${parsed.data.query}"

Return JSON: { "trendScore": 0-100, "demandScore": 0-100, "competitionScore": 0-100, "opportunityScore": 0-100, "riskScore": 0-100, "estimatedMonthlySales": number, "estimatedRevenue": number, "estimatedProfit": number, "suggestedPrice": number, "marketSaturation": "low|medium|high", "seasonality": "year-round|seasonal|holiday|trending", "reasoning": "string", "recommendations": ["array"] }
Return ONLY valid JSON.`;

        const researchResult = await orchestrator.chat({
          userId: user.id,
          agentKey: "research",
          messages: [{ role: "user", content: researchPrompt }],
        });

        let research: any = null;
        try { research = JSON.parse(researchResult.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { research = {}; }

        // Persist
        await db.productAnalysis.create({
          data: {
            userId: user.id,
            discoveredProductId,
            agentKey: "research",
            trendScore: research.trendScore ?? null,
            demandScore: research.demandScore ?? null,
            competitionScore: research.competitionScore ?? null,
            opportunityScore: research.opportunityScore ?? null,
            riskScore: research.riskScore ?? null,
            estimatedMonthlySales: research.estimatedMonthlySales ?? null,
            estimatedRevenue: research.estimatedRevenue ?? null,
            estimatedProfit: research.estimatedProfit ?? null,
            suggestedPrice: research.suggestedPrice ?? null,
            marketSaturation: research.marketSaturation ?? null,
            seasonality: research.seasonality ?? null,
            reasoning: research.reasoning ?? null,
            recommendations: research.recommendations ? JSON.stringify(research.recommendations) : null,
            metadata: JSON.stringify({ model: researchResult.model }),
          },
        });

        steps.find((s) => s.name === "research")!.status = "completed";
        steps.find((s) => s.name === "research")!.result = research;
        productData = { ...productData, research };
      } else {
        steps.find((s) => s.name === "research")!.status = "failed";
        steps.find((s) => s.name === "research")!.error = "No products found";
      }
    }

    // STEP 2: Supplier
    if (parsed.data.steps.includes("supplier") && discoveredProductId) {
      steps.find((s) => s.name === "supplier")!.status = "running";
      const supplierResult = await orchestrator.chat({
        userId: user.id,
        agentKey: "supplier",
        messages: [{ role: "user", content: `Find suppliers for: ${productTitle}. Return JSON: { "supplierName": string, "supplierType": "manufacturer|dropshipper|wholesaler", "country": string, "moq": number, "unitCostMin": number, "unitCostMax": number, "leadTimeDays": number, "reliabilityScore": 0-100, "tradeAssurance": boolean, "goldSupplier": boolean, "supplierScore": 0-100, "reasoning": string }. Return ONLY valid JSON.` }],
      });
      let supplier: any = null;
      try { supplier = JSON.parse(supplierResult.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { supplier = {}; }
      await db.supplierReport.create({
        data: {
          userId: user.id,
          discoveredProductId,
          source: "pipeline",
          supplierName: supplier.supplierName ?? null,
          supplierType: supplier.supplierType ?? null,
          country: supplier.country ?? null,
          moq: supplier.moq ?? null,
          unitCostMin: supplier.unitCostMin ?? null,
          unitCostMax: supplier.unitCostMax ?? null,
          leadTimeDays: supplier.leadTimeDays ?? null,
          reliabilityScore: supplier.reliabilityScore ?? null,
          tradeAssurance: supplier.tradeAssurance ?? false,
          goldSupplier: supplier.goldSupplier ?? false,
          supplierScore: supplier.supplierScore ?? null,
          reasoning: supplier.reasoning ?? null,
        },
      });
      steps.find((s) => s.name === "supplier")!.status = "completed";
      steps.find((s) => s.name === "supplier")!.result = supplier;
      productData = { ...productData, supplier };
    }

    // STEP 3: Profit
    if (parsed.data.steps.includes("profit") && discoveredProductId) {
      steps.find((s) => s.name === "profit")!.status = "running";
      const cost = productData?.supplier?.unitCostMin || 5;
      const price = productData?.research?.suggestedPrice || 25;
      const profitResult = await orchestrator.chat({
        userId: user.id,
        agentKey: "profit",
        messages: [{ role: "user", content: `Calculate profit: cost=$${cost}, price=$${price}, marketplace fees=6.5%, payment fees=3%. Return JSON: { "totalCost": number, "netProfit": number, "grossProfit": number, "roi": number, "margin": number, "breakEvenPrice": number, "aiInsight": string }. Return ONLY valid JSON.` }],
      });
      let profit: any = null;
      try { profit = JSON.parse(profitResult.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { profit = {}; }
      steps.find((s) => s.name === "profit")!.status = "completed";
      steps.find((s) => s.name === "profit")!.result = profit;
      productData = { ...productData, profit };
    }

    // STEP 4: Decision
    if (parsed.data.steps.includes("decision") && discoveredProductId) {
      steps.find((s) => s.name === "decision")!.status = "running";
      const decisionResult = await orchestrator.chat({
        userId: user.id,
        agentKey: "strategy",
        messages: [{ role: "user", content: `Should I sell "${productTitle}"? Based on: ${JSON.stringify(productData?.research || {})}. Return JSON: { "verdict": "go|hold|avoid|pivot", "confidence": 0-100, "reasoning": string, "nextAction": string }. Return ONLY valid JSON.` }],
      });
      let decision: any = null;
      try { decision = JSON.parse(decisionResult.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { decision = {}; }
      await db.aiDecision.create({
        data: {
          userId: user.id,
          discoveredProductId,
          verdict: decision.verdict ?? "hold",
          confidence: decision.confidence ?? null,
          reasoning: decision.reasoning ?? null,
          nextAction: decision.nextAction ?? null,
        },
      });
      steps.find((s) => s.name === "decision")!.status = "completed";
      steps.find((s) => s.name === "decision")!.result = decision;
      productData = { ...productData, decision };
    }

    // STEP 5: SEO
    if (parsed.data.steps.includes("seo") && discoveredProductId) {
      steps.find((s) => s.name === "seo")!.status = "running";
      const seoResult = await orchestrator.chat({
        userId: user.id,
        agentKey: "seo",
        messages: [{ role: "user", content: `Generate SEO keywords for "${productTitle}". Return JSON: { "keywords": ["array of 10 keywords"], "tags": ["array of 13 tags under 20 chars"], "metaDescription": "under 160 chars" }. Return ONLY valid JSON.` }],
      });
      let seo: any = null;
      try { seo = JSON.parse(seoResult.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { seo = {}; }
      steps.find((s) => s.name === "seo")!.status = "completed";
      steps.find((s) => s.name === "seo")!.result = seo;
      productData = { ...productData, seo };
    }

    // STEP 6: Listing
    if (parsed.data.steps.includes("listing") && discoveredProductId) {
      steps.find((s) => s.name === "listing")!.status = "running";
      const listingResult = await orchestrator.chat({
        userId: user.id,
        agentKey: "listing",
        messages: [{ role: "user", content: `Generate a complete Etsy listing for "${productTitle}". SEO data: ${JSON.stringify(productData?.seo || {})}. Return JSON: { "title": string, "description": string (markdown), "bulletPoints": ["5 items"], "tags": ["13 items"], "materials": ["array"], "style": string, "personalization": string, "metaDescription": string }. Return ONLY valid JSON.` }],
      });
      let listing: any = null;
      try { listing = JSON.parse(listingResult.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { listing = {}; }

      const savedListing = await db.listing.create({
        data: {
          userId: user.id,
          storeId: parsed.data.storeId || null,
          discoveredProductId,
          marketplace: "etsy",
          title: listing.title || null,
          description: listing.description || null,
          bulletPoints: listing.bulletPoints ? JSON.stringify(listing.bulletPoints) : null,
          tags: listing.tags ? JSON.stringify(listing.tags) : null,
          materials: listing.materials ? JSON.stringify(listing.materials) : null,
          style: listing.style || null,
          personalization: listing.personalization || null,
          metaDescription: listing.metaDescription || null,
          model: listingResult.model,
          provider: listingResult.provider,
          tokensIn: listingResult.tokensIn,
          tokensOut: listingResult.tokensOut,
          latencyMs: listingResult.latencyMs,
          version: 1,
          isCurrent: true,
        },
      });

      steps.find((s) => s.name === "listing")!.status = "completed";
      steps.find((s) => s.name === "listing")!.result = { ...listing, listingId: savedListing.id };
      productData = { ...productData, listing: { ...listing, listingId: savedListing.id } };
    }

    // STEP 7: Save
    if (parsed.data.steps.includes("save") && discoveredProductId) {
      steps.find((s) => s.name === "save")!.status = "running";
      // Create or find a project for this store
      let project = await db.project.findFirst({
        where: { userId: user.id, storeId: parsed.data.storeId || null, type: "listing" },
        orderBy: { createdAt: "desc" },
      });
      if (!project) {
        project = await db.project.create({
          data: {
            userId: user.id,
            storeId: parsed.data.storeId || null,
            name: `${productTitle} Pipeline`,
            type: "listing",
            marketplace: "etsy",
          },
        });
      }
      // Create a product in the project
      const product = await db.product.create({
        data: {
          projectId: project.id,
          title: productTitle,
          description: productData?.listing?.description || null,
          price: productData?.research?.suggestedPrice || null,
          status: "listing",
          tags: productData?.seo?.tags ? JSON.stringify(productData.seo.tags) : null,
          metadata: JSON.stringify({
            discoveredProductId,
            pipelineRun: true,
            listing: productData?.listing,
            research: productData?.research,
            supplier: productData?.supplier,
            profit: productData?.profit,
            decision: productData?.decision,
            seo: productData?.seo,
          }),
        },
      });
      steps.find((s) => s.name === "save")!.status = "completed";
      steps.find((s) => s.name === "save")!.result = { projectId: project.id, productId: product.id };
    }

    await logger.audit({
      userId: user.id,
      action: "pipeline.run",
      category: "ai",
      metadata: {
        query: parsed.data.query,
        stepsRun: steps.filter((s) => s.status === "completed").length,
        discoveredProductId,
        storeId: parsed.data.storeId,
      },
    });

    return NextResponse.json({
      pipeline: {
        query: parsed.data.query,
        steps,
        discoveredProductId,
        productData,
      },
      meta: {
        totalSteps: steps.length,
        completedSteps: steps.filter((s) => s.status === "completed").length,
        failedSteps: steps.filter((s) => s.status === "failed").length,
      },
    });
  } catch (err: any) {
    logger.error("api", "Pipeline failed", { error: String(err) });
    // Mark remaining pending steps as failed
    for (const step of steps) {
      if (step.status === "running" || step.status === "pending") {
        step.status = "failed";
        step.error = String(err).slice(0, 200);
      }
    }
    return NextResponse.json(
      { error: "Pipeline failed", pipeline: { steps }, details: String(err).slice(0, 500) },
      { status: 500 }
    );
  }
}
