import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/**
 * Duplicate a project (and all its products).
 * Path: POST /api/projects/[projectId]/duplicate
 */
export async function POST(
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
  const original = await db.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: { products: true },
  });
  if (!original) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Create the duplicate with "(Copy)" suffix
  const duplicate = await db.project.create({
    data: {
      userId: user.id,
      name: `${original.name} (Copy)`,
      description: original.description,
      type: original.type,
      status: "draft", // duplicates start as draft
      marketplace: original.marketplace,
      metadata: original.metadata,
    },
  });

  // Copy all products
  if (original.products.length > 0) {
    await db.product.createMany({
      data: original.products.map((p) => ({
        projectId: duplicate.id,
        title: p.title,
        description: p.description,
        category: p.category,
        tags: p.tags,
        price: p.price,
        currency: p.currency,
        sku: p.sku,
        status: p.status,
        metadata: p.metadata,
      })),
    });
  }

  await logger.audit({
    userId: user.id,
    action: "commerce.project.duplicate",
    category: "commerce",
    resourceId: duplicate.id,
    metadata: { originalId: projectId, originalName: original.name },
  });

  const result = {
    ...duplicate,
    _count: { products: original.products.length },
  };

  return NextResponse.json({ project: result });
}
