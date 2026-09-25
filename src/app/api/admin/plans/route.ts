import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:plans:write");
  if (!guard.ok) return guard.response;
  const plans = await db.subscriptionPlan.findMany({
    include: { _count: { select: { subscriptions: true } } },
    orderBy: [{ priceMonthly: "asc" }],
  });
  return NextResponse.json({ plans });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req, "admin:plans:write");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const planId = url.searchParams.get("planId");
  if (!planId)
    return NextResponse.json({ error: "planId required" }, { status: 400 });
  const body = await req.json();
  const updated = await db.subscriptionPlan.update({
    where: { id: planId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.priceMonthly !== undefined ? { priceMonthly: body.priceMonthly } : {}),
      ...(body.priceYearly !== undefined ? { priceYearly: body.priceYearly } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.limits !== undefined ? { limits: JSON.stringify(body.limits) } : {}),
    },
  });
  await logger.audit({
    userId: guard.user.id,
    action: "admin.plan.update",
    category: "admin",
    resourceId: planId,
  });
  return NextResponse.json({ plan: updated });
}
