import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/**
 * User-facing notifications. Any authenticated user can read their own.
 * This is separate from /api/admin/notifications (broadcast endpoint).
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limit = Math.min(
    Number(url.searchParams.get("limit") || "50"),
    200
  );

  const notifications = await db.notification.findMany({
    where: {
      userId: user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const unreadCount = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });
  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: Request) {
  // Mark one or all notifications as read.
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || body.action;

  if (action === "mark-all-read") {
    await db.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    await logger.audit({
      userId: user.id,
      action: "user.notifications.mark_all_read",
      category: "auth",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "mark-read" && body.notificationId) {
    await db.notification.updateMany({
      where: { id: body.notificationId, userId: user.id },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const notificationId = url.searchParams.get("notificationId");
  if (!notificationId) {
    return NextResponse.json(
      { error: "notificationId required" },
      { status: 400 }
    );
  }
  await db.notification.deleteMany({
    where: { id: notificationId, userId: user.id },
  });
  return NextResponse.json({ ok: true });
}
