import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:agents:read");
  if (!guard.ok) return guard.response;
  const agents = await db.aiAgent.findMany({
    orderBy: { category: "asc" },
  });
  return NextResponse.json({ agents });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req, "admin:agents:write");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  if (!agentId)
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  const body = await req.json();
  const updated = await db.aiAgent.update({
    where: { id: agentId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.defaultModel !== undefined
        ? { defaultModel: body.defaultModel }
        : {}),
      ...(body.systemPromptKey !== undefined
        ? { systemPromptKey: body.systemPromptKey }
        : {}),
    },
  });
  await logger.audit({
    userId: guard.user.id,
    action: "admin.agent.update",
    category: "admin",
    resourceId: agentId,
  });
  return NextResponse.json({ agent: updated });
}
