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
  if (!requirePermission(user, "commerce:products:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { projectId } = await params;
  // Ensure ownership
  const project = await db.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const products = await db.product.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().default("USD"),
  sku: z.string().optional(),
  status: z.string().default("idea"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "commerce:products:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { projectId } = await params;
  const project = await db.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const product = await db.product.create({
    data: {
      projectId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      tags: parsed.data.tags ? JSON.stringify(parsed.data.tags) : null,
      price: parsed.data.price,
      currency: parsed.data.currency,
      sku: parsed.data.sku,
      status: parsed.data.status,
      metadata: parsed.data.metadata
        ? JSON.stringify(parsed.data.metadata)
        : null,
    },
  });
  await logger.audit({
    userId: user.id,
    action: "commerce.product.create",
    category: "commerce",
    resourceId: product.id,
    metadata: { title: parsed.data.title, projectId },
  });
  return NextResponse.json({ product });
}
