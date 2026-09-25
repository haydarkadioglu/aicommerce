"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Sparkles,
  Loader2,
  Cpu,
  Zap,
  Clock,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Lightbulb,
  Target,
  Rocket,
  History,
} from "lucide-react";

const SUGGESTIONS = [
  "Eco-friendly home goods 2026",
  "Pet accessories for remote workers",
  "Wellness & self-care niche",
  "Baby & nursery minimalist products",
  "Smart home accessories",
  "Handmade jewelry for fall 2026",
];

const WHAT_YOU_GET = [
  {
    icon: TrendingUp,
    title: "Momentum",
    description: "Rising / Stable / Declining",
    color: "text-emerald-500",
  },
  {
    icon: Lightbulb,
    title: "Drivers",
    description: "What's fueling the trend",
    color: "text-amber-500",
  },
  {
    icon: Target,
    title: "Recommended Action",
    description: "Concrete next steps",
    color: "text-violet-500",
  },
  {
    icon: Rocket,
    title: "Example Products",
    description: "3 test product ideas",
    color: "text-sky-500",
  },
];

type PastReport = {
  id: string;
  title: string | null;
  agentKey: string;
  updatedAt: string;
};

export function TrendAnalysis() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    content: string;
    model?: string;
    tokensIn?: number;
    tokensOut?: number;
    latencyMs?: number;
  } | null>(null);
  const [pastReports, setPastReports] = useState<PastReport[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ conversations: PastReport[] }>(
          "/api/ai/conversations"
        );
        setPastReports(
          (data.conversations || []).filter((c) => c.agentKey === "trend")
        );
      } catch {
        // ignore
      }
    })();
  }, [apiFetch]);

  const analyze = async (q?: string) => {
    const finalQ = (q || query).trim();
    if (!finalQ) {
      toast({
        title: "Describe a niche",
        description: "Enter a product category or niche to analyze.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setResult(null);
    setQuery(finalQ);
    try {
      const data = await apiFetch<{
        content: string;
        model: string;
        tokensIn: number;
        tokensOut: number;
        latencyMs: number;
      }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          agentKey: "trend",
          message: finalQ,
        }),
      });
      setResult(data);
      // Refresh past reports
      const data2 = await apiFetch<{ conversations: PastReport[] }>(
        "/api/ai/conversations"
      );
      setPastReports(
        (data2.conversations || []).filter((c) => c.agentKey === "trend")
      );
    } catch (err: any) {
      toast({
        title: "Analysis failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
          <TrendingUp className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trend Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Spot rising niches and seasonal demand with the Trend Agent.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: form + result */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyze a trend</CardTitle>
              <CardDescription>
                Enter a niche, product category, or keyword. The Trend Agent
                will report momentum, drivers, and recommended actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Eco-friendly home goods, fall 2026"
                rows={3}
                disabled={loading}
              />
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent hover:border-primary/40 transition-colors"
                    onClick={() => !loading && analyze(s)}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
              <Button
                onClick={() => analyze()}
                disabled={loading || !query.trim()}
                className="brand-gradient text-white"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Analyze Trend
              </Button>
            </CardContent>
          </Card>

          {loading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Analyzing trends...
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LineChart className="size-4 text-primary" />
                    Trend Report
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {result.model && (
                      <span className="flex items-center gap-1">
                        <Cpu className="size-3" />
                        {result.model}
                      </span>
                    )}
                    {(result.tokensIn || result.tokensOut) && (
                      <span className="flex items-center gap-1">
                        <Zap className="size-3" />
                        {(result.tokensIn ?? 0) + (result.tokensOut ?? 0)} tok
                      </span>
                    )}
                    {result.latencyMs !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {result.latencyMs} ms
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:bg-muted prose-pre:text-foreground prose-headings:mt-3 prose-headings:mb-2">
                  <ReactMarkdown>{result.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !result && (
            <Card className="border-dashed">
              <CardContent className="py-10 flex flex-col items-center justify-center text-center">
                <LineChart className="size-10 text-muted-foreground/40 mb-2" />
                <h3 className="text-base font-semibold">No report yet</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Enter a niche above (or pick a suggestion chip) and click{" "}
                  <strong>Analyze Trend</strong> to see momentum, drivers, and
                  product ideas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: what you get + history */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What you&apos;ll get</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {WHAT_YOU_GET.map((w) => (
                  <li key={w.title} className="flex items-start gap-2.5">
                    <span
                      className={`flex size-7 items-center justify-center rounded-md bg-muted ${w.color} shrink-0`}
                    >
                      <w.icon className="size-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{w.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {pastReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="size-3.5" />
                  Recent reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 max-h-64 overflow-y-auto scroll-thin">
                  {pastReports.slice(0, 10).map((r) => (
                    <li
                      key={r.id}
                      className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => {
                        setQuery(r.title || "");
                        // Just populate the query; user can re-run
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {r.title || "Untitled trend report"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
