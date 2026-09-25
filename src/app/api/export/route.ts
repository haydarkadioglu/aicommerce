import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/**
 * Export Center — exports reports in CSV/JSON format.
 * Supported report types:
 *   - products (discovered products)
 *   - profit (profit calculations)
 *   - suppliers (supplier reports)
 *   - competitors (competitor reports)
 *   - seo (SEO analyses)
 *   - listings (AI-generated listings)
 *   - opportunities (opportunity scans)
 */

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const reportType = url.searchParams.get("type") || "products";
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  let data: any[] = [];
  let headers: string[] = [];
  let filename = `${reportType}-report`;

  switch (reportType) {
    case "products": {
      data = await db.discoveredProduct.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 500 });
      headers = ["title", "source", "price", "currency", "category", "sourceUrl", "createdAt"];
      filename = "products";
      break;
    }
    case "profit": {
      data = await db.profitCalculation.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 500 });
      headers = ["productCost", "shippingCost", "packagingCost", "suggestedPrice", "totalCost", "netProfit", "grossProfit", "roi", "margin", "breakEvenPrice", "createdAt"];
      filename = "profit-report";
      break;
    }
    case "suppliers": {
      data = await db.supplierReport.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 500 });
      headers = ["supplierName", "source", "supplierType", "country", "moq", "unitCostMin", "unitCostMax", "leadTimeDays", "reliabilityScore", "supplierScore", "tradeAssurance", "goldSupplier", "createdAt"];
      filename = "supplier-report";
      break;
    }
    case "competitors": {
      data = await db.competitorReport.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 500 });
      headers = ["shopName", "listingTitle", "listingPrice", "pricingScore", "listingQualityScore", "seoScore", "imageScore", "createdAt"];
      filename = "competitor-report";
      break;
    }
    case "seo": {
      const listings = await db.listing.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100, include: { seoAnalyses: { orderBy: { createdAt: "desc" }, take: 1 } } });
      data = listings.filter(l => l.seoAnalyses.length > 0).map(l => ({ ...l.seoAnalyses[0], listingTitle: l.title }));
      headers = ["listingTitle", "seoScore", "readabilityScore", "searchVisibilityEstimate", "createdAt"];
      filename = "seo-report";
      break;
    }
    case "listings": {
      data = await db.listing.findMany({ where: { userId: user.id, isCurrent: true }, orderBy: { createdAt: "desc" }, take: 200 });
      headers = ["title", "marketplace", "style", "room", "occasion", "holiday", "personalization", "seoScore", "createdAt"];
      filename = "listings";
      break;
    }
    case "opportunities": {
      data = await db.opportunityScan.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200 });
      headers = ["scanType", "keyword", "productTitle", "productSource", "opportunityScore", "trendScore", "demandScore", "competitionScore", "profitScore", "confidence", "createdAt"];
      filename = "opportunities";
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  }

  await logger.audit({ userId: user.id, action: "export.report", category: "system", metadata: { reportType, format, rowCount: data.length } });

  if (format === "json") {
    return new NextResponse(JSON.stringify({ reportType, exportedAt: new Date().toISOString(), count: data.length, data }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${filename}.json"` },
    });
  }

  // CSV
  const escape = (val: any) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = data.map(row => headers.map(h => escape(row[h])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${filename}.csv"` },
  });
}
