import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "ai:conversations:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");

  if (conversationId) {
    const conversation = await db.aiConversation.findFirst({
      where: { id: conversationId, userId: user.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ conversation });
  }

  const conversations = await db.aiConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      _count: { select: { messages: true } },
    },
  });
  return NextResponse.json({ conversations });
}

export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId required" },
      { status: 400 }
    );
  }
  await db.aiConversation.deleteMany({
    where: { id: conversationId, userId: user.id },
  });
  await logger.audit({
    userId: user.id,
    action: "ai.conversation.delete",
    category: "ai",
    resourceId: conversationId,
  });
  return NextResponse.json({ ok: true });
}
