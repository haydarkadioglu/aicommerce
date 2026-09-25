import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { clearProviderCache } from "@/lib/ai/providers";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:providers:read");
  if (!guard.ok) return guard.response;
  const providers = await db.aiProvider.findMany({
    include: { models: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ providers });
}

const UpsertSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  baseUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  capabilities: z.string().default("text"),
  apiKey: z.string().optional(),
});

export async function POST(req: Request) {
  const guard = await requireAdmin(req, "admin:providers:write");
  if (!guard.ok) return guard.response;
  const body = await req.json();
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  const { apiKey, ...rest } = parsed.data;

  // If making this default, unset others
  if (rest.isDefault) {
    await db.aiProvider.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const config = apiKey ? JSON.stringify({ apiKey }) : undefined;
  const existing = await db.aiProvider.findUnique({
    where: { key: rest.key },
  });
  let provider;
  if (existing) {
    provider = await db.aiProvider.update({
      where: { key: rest.key },
      data: {
        ...rest,
        ...(config
          ? { config }
          : existing.config
          ? {}
          : { config: null }),
      },
    });
  } else {
    provider = await db.aiProvider.create({
      data: { ...rest, config },
    });
  }

  clearProviderCache();
  await logger.audit({
    userId: guard.user.id,
    action: "admin.provider.upsert",
    category: "admin",
    resourceId: provider.id,
    metadata: { key: provider.key, isDefault: provider.isDefault },
  });
  return NextResponse.json({ provider });
}

const ModelSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  displayName: z.string(),
  contextWindow: z.number().default(8000),
  inputCostPer1k: z.number().default(0),
  outputCostPer1k: z.number().default(0),
  capabilities: z.string().default("text"),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export async function PUT(req: Request) {
  const guard = await requireAdmin(req, "admin:providers:write");
  if (!guard.ok) return guard.response;
  const body = await req.json();
  const parsed = ModelSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  if (parsed.data.isDefault) {
    await db.aiModel.updateMany({
      where: { providerId: parsed.data.providerId, isDefault: true },
      data: { isDefault: false },
    });
  }
  const model = await db.aiModel.upsert({
    where: {
      providerId_modelId: {
        providerId: parsed.data.providerId,
        modelId: parsed.data.modelId,
      },
    },
    create: parsed.data,
    update: parsed.data,
  });
  clearProviderCache();
  return NextResponse.json({ model });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin(req, "admin:providers:write");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const providerId = url.searchParams.get("providerId");
  if (!providerId)
    return NextResponse.json({ error: "providerId required" }, { status: 400 });
  const provider = await db.aiProvider.findUnique({
    where: { id: providerId },
  });
  if (provider?.isDefault)
    return NextResponse.json(
      { error: "Cannot delete default provider" },
      { status: 400 }
    );
  await db.aiProvider.delete({ where: { id: providerId } });
  clearProviderCache();
  await logger.audit({
    userId: guard.user.id,
    action: "admin.provider.delete",
    category: "admin",
    resourceId: providerId,
  });
  return NextResponse.json({ ok: true });
}
