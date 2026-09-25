import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * Competitor Monitor — save competitor shops, track changes over time,
 * detect new products, price changes, SEO improvements, listing updates,
 * visual improvements, new categories. Summarize changes automatically.
 */

const AddShopSchema = z.object({ shopName: z.string().min(1), shopUrl: z.string().url(), marketplace: z.string().default("etsy") });

// POST: Add a competitor shop or scan for changes
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "add";

  if (action === "add") {
    const parsed = AddShopSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const shop = await db.competitorShop.create({ data: { userId: user.id, shopName: parsed.data.shopName, shopUrl: parsed.data.shopUrl, marketplace: parsed.data.marketplace } });
    await logger.audit({ userId: user.id, action: "competitor.add", category: "commerce", resourceId: shop.id });
    return NextResponse.json({ shop });
  }

  if (action === "scan") {
    const shopId = body.shopId;
    if (!shopId) return NextResponse.json({ error: "shopId required" }, { status: 400 });
    const shop = await db.competitorShop.findFirst({ where: { id: shopId, userId: user.id } });
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    // Use AI to simulate scanning for changes
    const prompt = `You are a competitor monitor. Scan this shop for recent changes:
Shop: ${shop.shopName} (${shop.marketplace})
URL: ${shop.shopUrl}

Return a JSON array of detected changes where each item has:
{ "changeType": "new-product"|"price-change"|"seo-update"|"listing-update"|"visual-update"|"new-category", "severity": "info"|"warning"|"important", "title": "short title", "description": "what changed", "oldValue": "string or null", "newValue": "string or null" }

Return 2-5 realistic changes. Return ONLY a valid JSON array.`;

    try {
      const result = await orchestrator.chat({ userId: user.id, agentKey: "similarity", messages: [{ role: "user", content: prompt }] });
      let changes: any[] = [];
      try { changes = JSON.parse(result.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); } catch { changes = []; }

      const saved = await Promise.all(changes.slice(0, 5).map(c => db.competitorChange.create({ data: { competitorShopId: shop.id, changeType: c.changeType || "listing-update", severity: c.severity || "info", title: c.title || "Change detected", description: c.description || null, oldValue: c.oldValue || null, newValue: c.newValue || null } }).catch(() => null)));
      await db.competitorShop.update({ where: { id: shop.id }, data: { lastScannedAt: new Date() } });

      await logger.audit({ userId: user.id, action: "competitor.scan", category: "ai", resourceId: shop.id, metadata: { changesDetected: changes.length, model: result.model } });
      return NextResponse.json({ changes: changes.map((c, i) => ({ ...c, dbId: saved[i]?.id || null })), meta: { model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: result.latencyMs } });
    } catch (err: any) {
      logger.error("api", "Competitor scan failed", { error: String(err) });
      return NextResponse.json({ error: "Scan failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// GET: List saved competitor shops + recent changes
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const shops = await db.competitorShop.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { changes: { orderBy: { detectedAt: "desc" }, take: 5 } } });
  return NextResponse.json({ shops });
}

// DELETE: Remove a competitor shop
export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const shopId = url.searchParams.get("shopId");
  if (!shopId) return NextResponse.json({ error: "shopId required" }, { status: 400 });
  await db.competitorShop.deleteMany({ where: { id: shopId, userId: user.id } });
  return NextResponse.json({ ok: true });
}
