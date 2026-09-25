import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:flags:write");
  if (!guard.ok) return guard.response;
  const flags = await db.featureFlag.findMany({
    orderBy: [{ enabled: "desc" }, { key: "asc" }],
  });
  return NextResponse.json({ flags });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req, "admin:flags:write");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const flagId = url.searchParams.get("flagId");
  if (!flagId)
    return NextResponse.json({ error: "flagId required" }, { status: 400 });
  const body = await req.json();
  const updated = await db.featureFlag.update({
    where: { id: flagId },
    data: {
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.rollout !== undefined ? { rollout: body.rollout } : {}),
    },
  });
  await logger.audit({
    userId: guard.user.id,
    action: "admin.flag.update",
    category: "admin",
    resourceId: flagId,
    metadata: body,
  });
  return NextResponse.json({ flag: updated });
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req, "admin:flags:write");
  if (!guard.ok) return guard.response;
  const body = await req.json();
  const flag = await db.featureFlag.create({
    data: {
      key: body.key,
      name: body.name,
      description: body.description || null,
      enabled: body.enabled || false,
      rollout: body.rollout || 0,
    },
  });
  await logger.audit({
    userId: guard.user.id,
    action: "admin.flag.create",
    category: "admin",
    resourceId: flag.id,
  });
  return NextResponse.json({ flag });
}
