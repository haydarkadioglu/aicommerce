import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:usage:read");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const days = Math.min(
    Math.max(Number(url.searchParams.get("days") || "30"), 1),
    90
  );
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const usages = await db.aiUsage.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: {
      user: { select: { email: true, name: true } },
      provider: { select: { key: true, name: true } },
    },
  });

  // Aggregations
  const totalCalls = usages.length;
  const totalTokensIn = usages.reduce((s, u) => s + u.tokensIn, 0);
  const totalTokensOut = usages.reduce((s, u) => s + u.tokensOut, 0);
  const totalCost = usages.reduce((s, u) => s + u.costUsd, 0);
  const successRate = totalCalls
    ? (usages.filter((u) => u.success).length / totalCalls) * 100
    : 100;
  const avgLatency = totalCalls
    ? Math.round(usages.reduce((s, u) => s + u.latencyMs, 0) / totalCalls)
    : 0;

  const byProvider: Record<string, { calls: number; cost: number }> = {};
  const byAgent: Record<string, { calls: number; tokens: number }> = {};
  const byUser: Record<string, { calls: number; cost: number; email: string }> =
    {};

  // Daily breakdown — fill all days in range
  const byDay: Record<string, { calls: number; tokens: number; cost: number }> =
    {};
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    byDay[day] = { calls: 0, tokens: 0, cost: 0 };
  }

  for (const u of usages) {
    const pkey = u.provider?.key || "unknown";
    byProvider[pkey] = byProvider[pkey] || { calls: 0, cost: 0 };
    byProvider[pkey].calls += 1;
    byProvider[pkey].cost += u.costUsd;

    const akey = u.agentKey || "unknown";
    byAgent[akey] = byAgent[akey] || { calls: 0, tokens: 0 };
    byAgent[akey].calls += 1;
    byAgent[akey].tokens += u.tokensIn + u.tokensOut;

    const uid = u.userId || "anonymous";
    const email = u.user?.email || "anonymous";
    byUser[uid] = byUser[uid] || { calls: 0, cost: 0, email };
    byUser[uid].calls += 1;
    byUser[uid].cost += u.costUsd;

    const day = u.createdAt.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { calls: 0, tokens: 0, cost: 0 };
    byDay[day].calls += 1;
    byDay[day].tokens += u.tokensIn + u.tokensOut;
    byDay[day].cost += u.costUsd;
  }

  const daily = Object.entries(byDay)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return NextResponse.json({
    summary: {
      totalCalls,
      totalTokensIn,
      totalTokensOut,
      totalCost,
      successRate: Math.round(successRate * 100) / 100,
      avgLatencyMs: avgLatency,
    },
    daily,
    byProvider: Object.entries(byProvider)
      .map(([k, v]) => ({ provider: k, ...v }))
      .sort((a, b) => b.calls - a.calls),
    byAgent: Object.entries(byAgent)
      .map(([k, v]) => ({ agent: k, ...v }))
      .sort((a, b) => b.calls - a.calls),
    byUser: Object.values(byUser).sort((a, b) => b.calls - a.calls),
    recent: usages.slice(0, 50),
  });
}
