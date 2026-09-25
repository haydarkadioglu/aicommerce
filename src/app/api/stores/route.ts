import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CreateStoreSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  logo: z.string().url().optional().or(z.literal("")),
  marketplace: z.string().default("etsy"),
  storeUrl: z.string().url().optional().or(z.literal("")),
  country: z.string().default("US"),
  currency: z.string().default("USD"),
  language: z.string().default("en"),
  timezone: z.string().default("America/New_York"),
  notes: z.string().optional(),
  brandName: z.string().optional(),
  brandVoice: z.string().optional(),
  brandColors: z.string().optional(),
  defaultAiProvider: z.string().optional(),
  seoPreferences: z.string().optional(),
  imageStylePrefs: z.string().optional(),
  videoStylePrefs: z.string().optional(),
  notificationSettings: z.string().optional(),
  listingTemplates: z.string().optional(),
  promptTemplates: z.string().optional(),
  apiConnections: z.string().optional(),
  metadata: z.string().optional(),
});

/**
 * Store Management API — CRUD for stores.
 * Each user can have unlimited stores across multiple marketplaces.
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stores = await db.store.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          projects: true,
          discoveredProducts: true,
          listings: true,
        },
      },
    },
  });
  return NextResponse.json({ stores });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = CreateStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const store = await db.store.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      logo: parsed.data.logo || null,
      marketplace: parsed.data.marketplace,
      storeUrl: parsed.data.storeUrl || null,
      country: parsed.data.country,
      currency: parsed.data.currency,
      language: parsed.data.language,
      timezone: parsed.data.timezone,
      notes: parsed.data.notes || null,
      brandName: parsed.data.brandName || null,
      brandVoice: parsed.data.brandVoice || null,
      brandColors: parsed.data.brandColors || null,
      defaultAiProvider: parsed.data.defaultAiProvider || null,
      seoPreferences: parsed.data.seoPreferences || null,
      imageStylePrefs: parsed.data.imageStylePrefs || null,
      videoStylePrefs: parsed.data.videoStylePrefs || null,
      notificationSettings: parsed.data.notificationSettings || null,
      listingTemplates: parsed.data.listingTemplates || null,
      promptTemplates: parsed.data.promptTemplates || null,
      apiConnections: parsed.data.apiConnections || null,
      metadata: parsed.data.metadata || null,
    },
  });

  await logger.audit({
    userId: user.id,
    action: "store.create",
    category: "commerce",
    resourceId: store.id,
    metadata: { name: store.name, marketplace: store.marketplace },
  });

  return NextResponse.json({ store });
}
