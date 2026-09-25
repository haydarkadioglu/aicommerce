import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { z } from "zod";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:logs:read");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const severity = url.searchParams.get("severity");
  const action = url.searchParams.get("action");
  const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 500);

  const auditLogs = await db.auditLog.findMany({
    where: {
      AND: [
        category ? { category } : {},
        severity ? { severity } : {},
        action ? { action: { contains: action } } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { email: true, name: true } } },
  });
  const systemLogs = await db.systemLog.findMany({
    where: severity ? { level: severity } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ audit: auditLogs, system: systemLogs });
}
