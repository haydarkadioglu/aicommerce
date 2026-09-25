import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:settings:write");
  if (!guard.ok) return guard.response;
  const settings = await db.setting.findMany({
    orderBy: { category: "asc" },
  });
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req, "admin:settings:write");
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as { key: string; value: string };
  if (!body.key)
    return NextResponse.json({ error: "key required" }, { status: 400 });
  const updated = await db.setting.upsert({
    where: { key: body.key },
    create: {
      key: body.key,
      value: body.value,
      updatedBy: guard.user.id,
    },
    update: {
      value: body.value,
      updatedBy: guard.user.id,
    },
  });
  await logger.audit({
    userId: guard.user.id,
    action: "admin.setting.update",
    category: "admin",
    resourceId: updated.id,
    metadata: { key: body.key },
  });
  return NextResponse.json({ setting: updated });
}
