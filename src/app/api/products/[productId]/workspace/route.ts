import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";

/**
 * Product Workspace — unified view of everything related to a product.
 * Inside each product: research, supplier analysis, competitor analysis,
 * trend analysis, profit reports, SEO reports, generated listings,
 * generated images, AI decisions, export history, notes, tasks.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await params;
  const product = await db.product.findFirst({
    where: { id: productId, project: { userId: user.id } },
    include: {
      project: { select: { id: true, name: true, storeId: true } },
    },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Load all related data
  const [analyses, listings, mediaAssets, decisions] = await Promise.all([
    // Research analyses (from metadata.discoveredProductId)
    db.productAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Listings linked to this product's project
    db.listing.findMany({
      where: { userId: user.id, projectId: product.projectId, isCurrent: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { seoAnalyses: true, mediaAssets: true } } },
    }),
    // Media assets
    db.mediaAsset.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // AI decisions
    db.aiDecision.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Parse product metadata for linked discoveredProductId
  let discoveredProductId: string | null = null;
  if (product.metadata) {
    try {
      const meta = JSON.parse(product.metadata);
      discoveredProductId = meta.discoveredProductId || null;
    } catch {}
  }

  // If we have a discoveredProductId, load its intelligence
  let discoveredProduct: any = null;
  let supplierReports: any[] = [];
  let competitorReports: any[] = [];
  let trendReports: any[] = [];
  let profitCalculations: any[] = [];
  let priceHistories: any[] = [];

  if (discoveredProductId) {
    discoveredProduct = await db.discoveredProduct.findUnique({
      where: { id: discoveredProductId },
      select: { id: true, title: true, source: true, price: true, imageUrl: true, sourceUrl: true, category: true },
    });
    [supplierReports, competitorReports, trendReports, profitCalculations, priceHistories] = await Promise.all([
      db.supplierReport.findMany({ where: { discoveredProductId }, orderBy: { createdAt: "desc" }, take: 3 }),
      db.competitorReport.findMany({ where: { discoveredProductId }, orderBy: { createdAt: "desc" }, take: 3 }),
      db.trendReport.findMany({ where: { keyword: product.title }, orderBy: { createdAt: "desc" }, take: 3 }),
      db.profitCalculation.findMany({ where: { discoveredProductId }, orderBy: { createdAt: "desc" }, take: 3 }),
      db.priceHistory.findMany({ where: { discoveredProductId }, orderBy: { detectedAt: "desc" }, take: 10 }),
    ]);
  }

  return NextResponse.json({
    product: {
      ...product,
      discoveredProductId,
    },
    workspace: {
      research: analyses.filter(a => a.discoveredProductId === discoveredProductId),
      supplierReports,
      competitorReports,
      trendReports,
      profitCalculations,
      priceHistories,
      listings,
      mediaAssets,
      decisions: decisions.filter(d => d.discoveredProductId === discoveredProductId),
      discoveredProduct,
    },
  });
}
