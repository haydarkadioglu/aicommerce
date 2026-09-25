import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { getUserPlan, checkAiCallLimit } from "@/lib/subscription";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "ai:usage:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || "30"), 1), 90);
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  // If admin, can view all; otherwise just own usage.
  const where = user.roles.includes("admin")
    ? { createdAt: { gte: since } }
    : { userId: user.id, createdAt: { gte: since } };

  const usages = await db.aiUsage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Also fetch the PREVIOUS period for delta computation
  const prevSince = new Date(since);
  prevSince.setDate(prevSince.getDate() - days);
  const prevWhere = user.roles.includes("admin")
    ? { createdAt: { gte: prevSince, lt: since } }
    : { userId: user.id, createdAt: { gte: prevSince, lt: since } };
  const prevUsages = await db.aiUsage.findMany({
    where: prevWhere,
    take: 500,
    select: {
      tokensIn: true,
      tokensOut: true,
      costUsd: true,
      success: true,
      latencyMs: true,
    },
  });

  const totalCalls = usages.length;
  const totalTokensIn = usages.reduce((s, u) => s + u.tokensIn, 0);
  const totalTokensOut = usages.reduce((s, u) => s + u.tokensOut, 0);
  const totalCost = usages.reduce((s, u) => s + u.costUsd, 0);
  const successRate = totalCalls
    ? (usages.filter((u) => u.success).length / totalCalls) * 100
    : 100;
  const avgLatency = totalCalls
    ? Math.round(
        usages.reduce((s, u) => s + u.latencyMs, 0) / totalCalls
      )
    : 0;

  // Previous-period totals for delta computation
  const prevTotalCalls = prevUsages.length;
  const prevTotalTokens =
    prevUsages.reduce((s, u) => s + u.tokensIn + u.tokensOut, 0);
  const prevTotalCost = prevUsages.reduce((s, u) => s + u.costUsd, 0);

  // Helper: compute % change safely
  const pct = (cur: number, prev: number): number | null => {
    if (prev === 0) return cur > 0 ? 100 : null;
    return Math.round(((cur - prev) / prev) * 1000) / 10;
  };

  // Daily breakdown — fill all `days` buckets with zeros so the chart
  // shows a continuous 30-day timeline (not just days with activity).
  const byDay: Record<string, { calls: number; tokens: number; cost: number }> =
    {};
  // Initialize all days in range
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    byDay[day] = { calls: 0, tokens: 0, cost: 0 };
  }
  // Fill in actual usage
  for (const u of usages) {
    const day = u.createdAt.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { calls: 0, tokens: 0, cost: 0 };
    byDay[day].calls += 1;
    byDay[day].tokens += u.tokensIn + u.tokensOut;
    byDay[day].cost += u.costUsd;
  }
  const daily = Object.entries(byDay)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Breakdown by agent
  const byAgent: Record<string, { calls: number; tokens: number }> = {};
  for (const u of usages) {
    const k = u.agentKey || "unknown";
    byAgent[k] = byAgent[k] || { calls: 0, tokens: 0 };
    byAgent[k].calls += 1;
    byAgent[k].tokens += u.tokensIn + u.tokensOut;
  }
  const byAgentList = Object.entries(byAgent)
    .map(([agentKey, data]) => ({ agentKey, ...data }))
    .sort((a, b) => b.calls - a.calls);

  return NextResponse.json({
    summary: {
      totalCalls,
      totalTokensIn,
      totalTokensOut,
      totalCost,
      successRate: Math.round(successRate * 100) / 100,
      avgLatencyMs: avgLatency,
      // Deltas vs previous period
      deltaCalls: pct(totalCalls, prevTotalCalls),
      deltaTokens: pct(totalTokensIn + totalTokensOut, prevTotalTokens),
      deltaCost: pct(totalCost, prevTotalCost),
      prevPeriodCalls: prevTotalCalls,
    },
    daily,
    byAgent: byAgentList,
    recent: usages.slice(0, 10),
    // Plan-based usage limit info
    plan: await buildPlanSummary(user.id),
  });
}

async function buildPlanSummary(userId: string) {
  const plan = await getUserPlan(userId);
  const usageCheck = await checkAiCallLimit(userId);
  return {
    key: plan.planKey,
    name: plan.planName,
    aiCallsUsed: usageCheck.used,
    aiCallsLimit: usageCheck.limit, // -1 = unlimited
    aiCallsRemaining: usageCheck.remaining,
    projectsLimit: plan.limits.projects ?? 0,
  };
}
