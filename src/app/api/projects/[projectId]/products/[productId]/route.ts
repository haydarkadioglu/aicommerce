import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/**
 * Delete a single product from a project.
 * Path: /api/projects/[projectId]/products/[productId]
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; productId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "commerce:products:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { projectId, productId } = await params;
  // Verify project ownership
  const project = await db.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const deleted = await db.product.deleteMany({
    where: { id: productId, projectId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  await logger.audit({
    userId: user.id,
    action: "commerce.product.delete",
    category: "commerce",
    resourceId: productId,
    metadata: { projectId },
  });
  return NextResponse.json({ ok: true });
}
