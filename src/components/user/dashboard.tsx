"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useAppStore } from "@/stores/app-store";
import { OnboardingCard } from "@/components/user/onboarding/onboarding-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { relativeTime, relativeTimeShort } from "@/lib/relative-time";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Bot,
  Coins,
  FileText,
  Sparkles,
  ArrowRight,
  Search,
  Calculator,
  TrendingUp,
  Zap,
  MessageSquare,
  Activity,
  Image as ImageIcon,
  FolderKanban,
  ShieldHalf,
  Clock,
  Tag,
} from "lucide-react";

type UsageSummary = {
  totalCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  successRate: number;
  avgLatencyMs: number;
  deltaCalls?: number | null;
  deltaTokens?: number | null;
  deltaCost?: number | null;
  prevPeriodCalls?: number;
};

type PlanSummary = {
  key: string;
  name: string;
  aiCallsUsed: number;
  aiCallsLimit: number; // -1 = unlimited
  aiCallsRemaining: number;
  projectsLimit: number;
};

type DailyEntry = {
  date: string;
  calls: number;
  tokens: number;
  cost: number;
};

type ByAgentEntry = {
  agentKey: string;
  calls: number;
  tokens: number;
};

type RecentUsage = {
  id: string;
  agentKey: string | null;
  modelId: string | null;
  endpoint: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  createdAt: string;
};

type Conversation = {
  id: string;
  agentKey: string;
  title: string | null;
  updatedAt: string;
  _count?: { messages: number };
};

const QUICK_ACTIONS = [
  { key: "ai-assistant", label: "AI Assistant", icon: Bot, desc: "Chat with any agent" },
  { key: "product-research", label: "Product Research", icon: Search, desc: "Find new opportunities" },
  { key: "listing-generator", label: "Listing Generator", icon: FileText, desc: "Generate listings" },
  { key: "image-studio", label: "Image Studio", icon: ImageIcon, desc: "Generate product images" },
  { key: "seo-studio", label: "SEO Studio", icon: Tag, desc: "Titles, tags, keywords" },
  { key: "profit-calculator", label: "Profit Calculator", icon: Calculator, desc: "Model margins" },
  { key: "trend-analysis", label: "Trend Analysis", icon: TrendingUp, desc: "Market trends" },
  { key: "saved-projects", label: "Saved Projects", icon: FolderKanban, desc: "Your projects" },
];

const AGENT_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "oklch(0.6 0.18 320)",
  "oklch(0.65 0.20 30)",
  "oklch(0.7 0.18 200)",
];

const AGENT_LABELS: Record<string, string> = {
  general: "General",
  research: "Research",
  seo: "SEO",
  trend: "Trend",
  listing: "Listing",
  supplier: "Supplier",
  profit: "Profit",
  pricing: "Pricing",
  similarity: "Similarity",
  vision: "Vision",
  prompt: "Prompt",
  strategy: "Strategy",
};

export function Dashboard() {
  const { apiFetch } = useApiClient();
  const setView = useAppStore((s) => s.setView);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [byAgent, setByAgent] = useState<ByAgentEntry[]>([]);
  const [recent, setRecent] = useState<RecentUsage[]>([]);
  const [recentImages, setRecentImages] = useState<
    Array<{
      id: string;
      prompt: string;
      size: string;
      dataUrl: string;
      createdAt: string;
    }>
  >([]);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [usage, conv, imgs] = await Promise.all([
          apiFetch<{
            summary: UsageSummary;
            daily: DailyEntry[];
            byAgent: ByAgentEntry[];
            recent: RecentUsage[];
            plan: PlanSummary;
          }>("/api/ai/usage?days=30"),
          apiFetch<{ conversations: Conversation[] }>(
            "/api/ai/conversations"
          ),
          apiFetch<{
            images: Array<{
              id: string;
              prompt: string;
              size: string;
              dataUrl: string;
              createdAt: string;
            }>;
          }>("/api/ai/images/list?limit=6").catch(() => ({ images: [] })),
        ]);
        if (!cancelled) {
          setSummary(usage.summary);
          setDaily(usage.daily || []);
          setByAgent(usage.byAgent || []);
          setRecent(usage.recent || []);
          setPlan(usage.plan || null);
          setConversations(conv.conversations || []);
          setRecentImages(imgs.images || []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s your AI workspace at a glance.
        </p>
      </div>

      <OnboardingCard />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              label="AI Calls (30d)"
              value={summary?.totalCalls ?? 0}
              icon={<Activity className="size-4" />}
              accent="default"
              delta={summary?.deltaCalls ?? null}
              hint={`prev: ${summary?.prevPeriodCalls ?? 0}`}
            />
            <StatCard
              label="Tokens Used"
              value={formatTokens(
                (summary?.totalTokensIn ?? 0) + (summary?.totalTokensOut ?? 0)
              )}
              icon={<Zap className="size-4" />}
              accent="emerald"
              delta={summary?.deltaTokens ?? null}
            />
            <StatCard
              label="Conversations"
              value={conversations.length}
              icon={<MessageSquare className="size-4" />}
              accent="default"
            />
            <StatCard
              label="Cost (30d)"
              value={`$${(summary?.totalCost ?? 0).toFixed(2)}`}
              icon={<Coins className="size-4" />}
              accent="default"
              delta={summary?.deltaCost ?? null}
              hint={
                summary?.deltaCost === null || summary?.deltaCost === undefined
                  ? "no charges yet"
                  : undefined
              }
            />
          </>
        )}
      </div>

      {/* Plan usage card */}
      {plan && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
                  <ShieldHalf className="size-4" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Your plan</p>
                  <p className="text-base font-semibold capitalize">
                    {plan.name}
                  </p>
                </div>
              </div>

              <div className="flex-1 min-w-[200px] max-w-md">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    AI calls this month
                  </span>
                  <span className="font-medium">
                    {plan.aiCallsUsed}{" "}
                    {plan.aiCallsLimit >= 0
                      ? `/ ${plan.aiCallsLimit}`
                      : "used"}
                  </span>
                </div>
                {plan.aiCallsLimit >= 0 ? (
                  <Progress
                    value={
                      plan.aiCallsLimit > 0
                        ? (plan.aiCallsUsed / plan.aiCallsLimit) * 100
                        : 0
                    }
                    className="h-1.5"
                  />
                ) : (
                  <div className="h-1.5 rounded-full bg-emerald-500/20 flex items-center px-2">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Unlimited
                    </span>
                  </div>
                )}
                {plan.aiCallsLimit >= 0 &&
                  plan.aiCallsRemaining <= 5 &&
                  plan.aiCallsRemaining > 0 && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Only {plan.aiCallsRemaining} calls left this month
                    </p>
                  )}
                {plan.aiCallsLimit >= 0 && plan.aiCallsRemaining === 0 && (
                  <p className="mt-1 text-xs text-destructive">
                    Limit reached — upgrade to keep using AI
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("settings")}
              >
                {plan.key === "free" ? "Upgrade plan" : "Manage plan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts: full-width AI Usage area */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>AI Usage</CardTitle>
              <CardDescription>Last 30 days · click legend to toggle metric</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="size-3" />
                {(summary?.successRate ?? 100).toFixed(1)}% success
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="size-3" />
                {(summary?.avgLatencyMs ?? 0).toLocaleString()}ms avg
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : daily.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={daily} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="tokGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  minTickGap={20}
                />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    color: "var(--color-popover-foreground)",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--color-muted-foreground)" }}
                  formatter={(value: number, name: string) => [
                    name === "tokens" ? `${value.toLocaleString()} tokens` : `${value} calls`,
                    name === "tokens" ? "Tokens" : "Calls",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="var(--color-chart-1)"
                  fill="url(#tokGrad)"
                  strokeWidth={2}
                  name="Tokens"
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="var(--color-chart-2)"
                  fill="url(#callsGrad)"
                  strokeWidth={1.5}
                  name="Calls"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Side-by-side: Recent Conversations + Calls by Agent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Last AI sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bot className="size-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No conversations yet.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setView("ai-assistant")}
                >
                  Start a chat
                </Button>
              </div>
            ) : (
              <ul className="space-y-1 max-h-72 overflow-y-auto scroll-thin">
                {conversations.slice(0, 8).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent cursor-pointer"
                    onClick={() => setView("ai-assistant")}
                  >
                    <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Bot className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {c.title || `${c.agentKey} conversation`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c._count?.messages ?? 0} messages ·{" "}
                        {relativeTime(c.updatedAt)}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calls by Agent</CardTitle>
            <CardDescription>Which agents you use most</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-52 w-full" />
            ) : byAgent.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                No agent activity yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <BarChart
                  data={byAgent.map((a) => ({
                    ...a,
                    label: AGENT_LABELS[a.agentKey] || a.agentKey,
                  }))}
                  margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="label"
                    fontSize={10}
                    stroke="var(--color-muted-foreground)"
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis fontSize={10} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      color: "var(--color-popover-foreground)",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--color-muted-foreground)" }}
                  />
                  <Bar dataKey="calls" radius={[4, 4, 0, 0]} minBarSize={12}>
                    {byAgent.map((_, i) => (
                      <Cell
                        key={i}
                        fill={AGENT_COLORS[i % AGENT_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent AI activity timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                Recent AI Activity
              </CardTitle>
              <CardDescription>Latest AI calls across all agents</CardDescription>
            </div>
            <Badge variant="outline">{recent.length} recent</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="py-8 text-center">
              <Activity className="size-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                No recent AI activity yet.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setView("ai-assistant")}
              >
                Start a conversation
              </Button>
            </div>
          ) : (
            <ul className="space-y-1 max-h-72 overflow-y-auto scroll-thin pr-1">
              {recent.slice(0, 12).map((r) => {
                const isImage = r.endpoint === "image";
                const ok = r.success;
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50 transition-colors"
                  >
                    <span
                      className={
                        "flex size-7 items-center justify-center rounded-md shrink-0 " +
                        (isImage
                          ? "bg-sky-500/10 text-sky-500"
                          : ok
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-destructive/10 text-destructive")
                      }
                    >
                      {isImage ? (
                        <ImageIcon className="size-3.5" />
                      ) : ok ? (
                        <Sparkles className="size-3.5" />
                      ) : (
                        <Activity className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {(r.agentKey &&
                          AGENT_LABELS[r.agentKey]) ||
                          r.agentKey ||
                          "Unknown"}{" "}
                        · {r.endpoint}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.modelId || "unknown model"}
                        {r.tokensIn + r.tokensOut > 0
                          ? ` · ${r.tokensIn + r.tokensOut} tokens`
                          : ""}
                        {r.latencyMs > 0 ? ` · ${r.latencyMs} ms` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {relativeTimeShort(r.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recent Images gallery */}
      {recentImages.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="size-4 text-primary" />
                  Recent Images
                </CardTitle>
                <CardDescription>
                  AI-generated product visuals
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("image-studio")}
              >
                Open Studio
                <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {recentImages.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setView("image-studio")}
                  className="group relative aspect-square overflow-hidden rounded-md border hover:border-primary/60 hover:ring-2 hover:ring-primary/30 transition-all"
                >
                  <img
                    src={img.dataUrl}
                    alt={img.prompt.slice(0, 80)}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                    <p className="text-[10px] text-white line-clamp-2">
                      {img.prompt}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Quick actions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {QUICK_ACTIONS.map((a) => (
            <Card
              key={a.key}
              className="group cursor-pointer hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              onClick={() => setView(a.key as any)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <a.icon className="size-4" />
                  </span>
                  <CardTitle className="text-sm">{a.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                  Open <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 rounded-md p-3 bg-destructive/5">
          {error}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  delta,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: "default" | "emerald";
  delta?: number | null;
  hint?: string;
}) {
  const showDelta = delta !== null && delta !== undefined && delta !== 0;
  const positive = (delta ?? 0) > 0;
  // When delta is 100% and previous was 0, it's misleading — show "new" instead
  const isNewPeriod = delta === 100 && positive;
  return (
    <Card className="hover:shadow-md hover:border-primary/30 transition-all group relative overflow-hidden">
      {/* Subtle gradient accent in corner */}
      <div className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <span
            className={
              accent === "emerald"
                ? "flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"
                : "flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
            }
          >
            {icon}
          </span>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {showDelta && !isNewPeriod ? (
          <div
            className={
              "mt-1 inline-flex items-center gap-0.5 text-xs font-medium " +
              (positive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground")
            }
          >
            <span aria-hidden>
              {positive ? "↑" : "↓"} {Math.abs(delta as number)}%
            </span>
            <span className="text-muted-foreground/70 ml-1">vs prev 30d</span>
          </div>
        ) : isNewPeriod ? (
          <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="rounded bg-emerald-500/10 px-1 py-0.5">new</span>
            <span className="text-muted-foreground/70">first 30d activity</span>
          </div>
        ) : hint ? (
          <div className="mt-1 text-xs text-muted-foreground">
            {hint}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-center">
      <Activity className="size-10 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">No usage data yet.</p>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        onClick={() => useAppStore.getState().setView("ai-assistant")}
      >
        Run your first AI call
      </Button>
    </div>
  );
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
