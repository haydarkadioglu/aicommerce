import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/**
 * Store detail API — GET/PATCH/DELETE a single store.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { storeId } = await params;
  const store = await db.store.findFirst({
    where: { id: storeId, userId: user.id },
    include: {
      _count: {
        select: {
          projects: true,
          discoveredProducts: true,
          listings: true,
          aiMemories: true,
          automationRules: true,
        },
      },
    },
  });
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }
  return NextResponse.json({ store });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { storeId } = await params;
  const body = await req.json();
  
  const updated = await db.store.updateMany({
    where: { id: storeId, userId: user.id },
    data: body,
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }
  await logger.audit({
    userId: user.id,
    action: "store.update",
    category: "commerce",
    resourceId: storeId,
    metadata: Object.keys(body),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { storeId } = await params;
  await db.store.deleteMany({
    where: { id: storeId, userId: user.id },
  });
  await logger.audit({
    userId: user.id,
    action: "store.delete",
    category: "commerce",
    resourceId: storeId,
  });
  return NextResponse.json({ ok: true });
}
