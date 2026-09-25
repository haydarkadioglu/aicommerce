import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { z } from "zod";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:notifications:broadcast");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const notifications = await db.notification.findMany({
    where: userId ? { userId } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ notifications });
}

const BroadcastSchema = z.object({
  title: z.string(),
  message: z.string(),
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
  link: z.string().optional(),
});

export async function POST(req: Request) {
  const guard = await requireAdmin(req, "admin:notifications:broadcast");
  if (!guard.ok) return guard.response;
  const body = await req.json();
  const parsed = BroadcastSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );

  // Broadcast to ALL users
  const users = await db.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  await db.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title: parsed.data.title,
      message: parsed.data.message,
      type: parsed.data.type,
      link: parsed.data.link,
    })),
  });
  await logger.audit({
    userId: guard.user.id,
    action: "admin.notification.broadcast",
    category: "admin",
    metadata: { title: parsed.data.title, recipients: users.length },
  });
  return NextResponse.json({ ok: true, recipients: users.length });
}
