import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:jobs:read");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const jobs = await db.backgroundJob.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });
  return NextResponse.json({ jobs });
}
