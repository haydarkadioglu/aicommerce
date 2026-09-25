import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:roles:read");
  if (!guard.ok) return guard.response;
  const permissions = await db.permission.findMany({
    include: { _count: { select: { roles: true } } },
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
  return NextResponse.json({ permissions });
}
