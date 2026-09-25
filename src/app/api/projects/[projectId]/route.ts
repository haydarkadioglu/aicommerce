import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "commerce:projects:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { projectId } = await params;
  const project = await db.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: { products: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ project });
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  marketplace: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "commerce:projects:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { projectId } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const data: any = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description;
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.marketplace) data.marketplace = parsed.data.marketplace;
  if (parsed.data.metadata !== undefined)
    data.metadata = JSON.stringify(parsed.data.metadata);

  const updated = await db.project.updateMany({
    where: { id: projectId, userId: user.id },
    data,
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  await logger.audit({
    userId: user.id,
    action: "commerce.project.update",
    category: "commerce",
    resourceId: projectId,
    metadata: parsed.data,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "commerce:projects:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { projectId } = await params;
  const deleted = await db.project.deleteMany({
    where: { id: projectId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  await logger.audit({
    userId: user.id,
    action: "commerce.project.delete",
    category: "commerce",
    resourceId: projectId,
  });
  return NextResponse.json({ ok: true });
}
