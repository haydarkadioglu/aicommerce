import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "commerce:projects:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const projects = await db.project.findMany({
    where: {
      userId: user.id,
      ...(status ? { status } : {}),
    },
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ projects });
}

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  type: z.string().default("general"),
  marketplace: z.string().default("etsy"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "commerce:projects:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const project = await db.project.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type,
      marketplace: parsed.data.marketplace,
      metadata: parsed.data.metadata
        ? JSON.stringify(parsed.data.metadata)
        : null,
    },
  });
  const projectWithCount = {
    ...project,
    _count: { products: 0 },
  };
  await logger.audit({
    userId: user.id,
    action: "commerce.project.create",
    category: "commerce",
    resourceId: project.id,
    metadata: { name: parsed.data.name, type: parsed.data.type },
  });
  return NextResponse.json({ project: projectWithCount });
}
