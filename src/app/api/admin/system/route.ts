import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { clearProviderCache } from "@/lib/ai/providers";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:settings:write");
  if (!guard.ok) return guard.response;

  const userCount = await db.user.count();
  const providerCount = await db.aiProvider.count({ where: { isActive: true } });
  const agentCount = await db.aiAgent.count({ where: { isActive: true } });
  const promptCount = await db.prompt.count({ where: { isActive: true } });

  // Today's AI usage
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayUsages = await db.aiUsage.findMany({
    where: { createdAt: { gte: startOfDay } },
    select: { tokensIn: true, tokensOut: true, costUsd: true, success: true },
  });
  const todayCalls = todayUsages.length;
  const todayTokens = todayUsages.reduce((s, u) => s + u.tokensIn + u.tokensOut, 0);
  const todayCost = todayUsages.reduce((s, u) => s + u.costUsd, 0);
  const todayFailed = todayUsages.filter((u) => !u.success).length;

  // Recent failed jobs
  const failedJobs = await db.backgroundJob.count({
    where: { status: "failed" },
  });
  const queuedJobs = await db.backgroundJob.count({
    where: { status: "queued" },
  });
  const runningJobs = await db.backgroundJob.count({
    where: { status: "running" },
  });

  // Logs (last 24h)
  const startOfYesterday = new Date();
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const auditCount = await db.auditLog.count({
    where: { createdAt: { gte: startOfYesterday } },
  });
  const errorLogs = await db.systemLog.count({
    where: { level: "error", createdAt: { gte: startOfYesterday } },
  });

  return NextResponse.json({
    system: {
      version: "1.0.0",
      status: "operational",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    },
    counts: {
      users: userCount,
      activeProviders: providerCount,
      activeAgents: agentCount,
      activePrompts: promptCount,
    },
    today: {
      calls: todayCalls,
      tokens: todayTokens,
      costUsd: todayCost,
      failedCalls: todayFailed,
    },
    jobs: {
      failed: failedJobs,
      queued: queuedJobs,
      running: runningJobs,
    },
    logs: {
      auditLast24h: auditCount,
      errorsLast24h: errorLogs,
    },
    database: {
      type: "sqlite",
      // @ts-ignore
      path: process.env.DATABASE_URL,
    },
  });
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req, "admin:settings:write");
  if (!guard.ok) return guard.response;
  const body = await req.json().catch(() => ({}));
  if (body.action === "clear-cache") {
    clearProviderCache();
    return NextResponse.json({ ok: true, cleared: "provider-cache" });
  }
  if (body.action === "reset-logs") {
    await db.systemLog.deleteMany({});
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
