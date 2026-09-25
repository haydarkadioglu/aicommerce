"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Coins, Cpu, Target, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Summary = {
  totalCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  successRate: number;
};

type ByProvider = { provider: string; calls: number; cost: number };
type ByAgent = { agent: string; calls: number; tokens: number };
type ByUser = { email: string; calls: number; cost: number };
type Recent = {
  id: string;
  agentKey: string | null;
  modelId: string | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  createdAt: string;
  user?: { email: string; name: string | null };
  provider?: { key: string; name: string } | null;
};

const PIE_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

export function AdminUsage() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [data, setData] = useState<{
    summary: Summary;
    byProvider: ByProvider[];
    byAgent: ByAgent[];
    byUser: ByUser[];
    recent: Recent[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{
        summary: Summary;
        byProvider: ByProvider[];
        byAgent: ByAgent[];
        byUser: ByUser[];
        recent: Recent[];
      }>("/api/admin/usage?days=30");
      setData(result);
    } catch (err: any) {
      toast({
        title: "Failed to load",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
     
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const s = data.summary;
  const totalTokens = s.totalTokensIn + s.totalTokensOut;
  const avgLatency = data.recent.length
    ? Math.round(data.recent.reduce((a, r) => a + r.latencyMs, 0) / data.recent.length)
    : 0;

  // Daily aggregation for chart (from recent)
  const byDay: Record<string, { date: string; calls: number }> = {};
  for (const r of data.recent) {
    const d = r.createdAt.slice(0, 10);
    byDay[d] = byDay[d] || { date: d, calls: 0 };
    byDay[d].calls += 1;
  }
  const daily = Object.values(byDay).sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usage Analytics</h2>
          <p className="text-sm text-muted-foreground">
            AI usage across all users (last 30 days).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Total calls"
          value={s.totalCalls}
          icon={<Activity className="size-4" />}
        />
        <StatCard
          label="Total tokens"
          value={formatTokens(totalTokens)}
          icon={<Cpu className="size-4" />}
          accent="emerald"
        />
        <StatCard
          label="Total cost"
          value={`$${s.totalCost.toFixed(4)}`}
          icon={<Coins className="size-4" />}
        />
        <StatCard
          label="Success rate"
          value={`${s.successRate.toFixed(1)}%`}
          icon={<Target className="size-4" />}
          accent="emerald"
        />
        <StatCard
          label="Avg latency"
          value={`${avgLatency}ms`}
          icon={<Clock className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Calls</CardTitle>
            <CardDescription>Recent AI call volume per day</CardDescription>
          </CardHeader>
          <CardContent>
            {daily.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(5)}
                    fontSize={11}
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="var(--color-chart-1)"
                    fill="url(#callsGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calls by Provider</CardTitle>
            <CardDescription>Distribution of AI calls</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byProvider.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.byProvider}
                    dataKey="calls"
                    nameKey="provider"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={(entry: any) => `${entry.provider}`}
                    labelLine={false}
                  >
                    {data.byProvider.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tokens by Agent</CardTitle>
            <CardDescription>Agent consumption breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byAgent.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.byAgent} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                  <XAxis dataKey="agent" fontSize={11} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                    {data.byAgent.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Usage</CardTitle>
          <CardDescription>Most recent AI calls</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto scroll-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.slice(0, 50).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {u.agentKey || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {u.modelId || "—"}
                    </TableCell>
                    <TableCell className="text-xs">{u.user?.email || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {u.tokensIn + u.tokensOut}
                    </TableCell>
                    <TableCell className="text-xs">
                      ${u.costUsd.toFixed(5)}
                    </TableCell>
                    <TableCell className="text-xs">{u.latencyMs}ms</TableCell>
                    <TableCell>
                      <Badge
                        variant={u.success ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {u.success ? "ok" : "fail"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: "default" | "emerald";
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span
            className={
              accent === "emerald"
                ? "flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500"
                : "flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary"
            }
          >
            {icon}
          </span>
        </div>
        <div className="mt-2 text-lg font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-60 flex flex-col items-center justify-center text-center">
      <Activity className="size-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">No data yet.</p>
    </div>
  );
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
