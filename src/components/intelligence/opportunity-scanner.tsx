"use client";

import { useState, useCallback } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scan,
  Loader2,
  Sparkles,
  TrendingUp,
  Target,
  DollarSign,
  AlertTriangle,
  Lightbulb,
  Trophy,
  Cpu,
  ShieldQuestion,
} from "lucide-react";

type Opportunity = {
  productTitle?: string;
  productSource?: string;
  opportunityScore?: number;
  trendScore?: number;
  demandScore?: number;
  competitionScore?: number;
  profitScore?: number;
  aiSummary?: string;
  risks?: string[];
  recommendedAction?: string;
  confidence?: number;
  dbId?: string | null;
  [key: string]: any;
};

type ScanResponse = {
  opportunities: Opportunity[];
  meta: {
    scanType: string;
    keyword: string;
    totalFound: number;
    ranked: number;
    model: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
  };
};

const SCAN_TYPES: { value: string; label: string; description: string }[] = [
  { value: "trending", label: "Trending", description: "Products with rising momentum" },
  { value: "low-competition", label: "Low Competition", description: "High demand, few sellers" },
  { value: "high-roi", label: "High ROI", description: "Best cost-to-price ratio" },
  { value: "seasonal", label: "Seasonal", description: "Upcoming seasonal demand" },
  { value: "emerging-category", label: "Emerging Category", description: "New product categories" },
];

export function OpportunityScanner() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [scanType, setScanType] = useState<string>("trending");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Opportunity[]>([]);
  const [meta, setMeta] = useState<ScanResponse["meta"] | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setResults([]);
    setMeta(null);
    try {
      const data = await apiFetch<ScanResponse>("/api/opportunities", {
        method: "POST",
        body: JSON.stringify({
          scanType,
          keyword: keyword.trim() || undefined,
          limit: 10,
        }),
      });
      setResults(data.opportunities || []);
      setMeta(data.meta);
      toast({
        title: `Ranked ${data.opportunities.length} opportunities`,
        description: `${data.meta.totalFound} scanned · ${data.meta.latencyMs}ms`,
      });
    } catch (err: any) {
      toast({
        title: "Scan failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, toast, scanType, keyword]);

  const activeScan = SCAN_TYPES.find((s) => s.value === scanType);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
          <Scan className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Opportunity Scanner</h2>
          <p className="text-sm text-muted-foreground">
            Continuously scan marketplaces, detect high-potential opportunities ranked by Opportunity Score.
          </p>
        </div>
      </div>

      {/* Scanner input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-violet-500" />
            Scan Configuration
          </CardTitle>
          <CardDescription>
            Pick a scan mode. A keyword is optional — defaults to a relevant search term per mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Scan mode</Label>
              <Select value={scanType} onValueChange={setScanType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCAN_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opp-keyword">Keyword (optional)</Label>
              <Input
                id="opp-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. handmade wood wall clock"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && scan()}
              />
            </div>
          </div>
          {activeScan && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{activeScan.label}:</span>{" "}
              {activeScan.description}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={scan}
              disabled={loading}
              className="brand-gradient text-white"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Scan className="size-4" />
              )}
              Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Meta summary */}
      {meta && (
        <Card>
          <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="capitalize">{meta.scanType}</Badge>
            {meta.keyword && <span>Keyword: <span className="font-medium text-foreground">{meta.keyword}</span></span>}
            <span>Scanned: <span className="font-medium text-foreground">{meta.totalFound}</span></span>
            <span>Ranked: <span className="font-medium text-foreground">{meta.ranked}</span></span>
            {meta.model && (
              <span className="ml-auto flex items-center gap-1">
                <Cpu className="size-3" />
                {meta.model} · {meta.latencyMs}ms
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Scan className="size-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">No opportunities yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Pick a scan mode above and click Scan to surface a ranked list of opportunities with
              trend, demand, competition, and profit scores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-h-[700px] overflow-y-auto scroll-thin pr-1">
          {results.map((opp, i) => (
            <OpportunityCard key={opp.dbId || i} index={i + 1} opp={opp} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helper components
// ============================================================

function OpportunityCard({
  index,
  opp,
}: {
  index: number;
  opp: Opportunity;
}) {
  const score = opp.opportunityScore;
  const scoreColor = score == null
    ? "text-muted-foreground"
    : score >= 75
      ? "text-emerald-500"
      : score >= 50
        ? "text-amber-500"
        : "text-rose-500";

  return (
    <Card className="group transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-violet-500/40">
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left: big opportunity score */}
          <div className="flex md:flex-col items-center justify-center gap-2 md:w-32 shrink-0 rounded-lg bg-violet-500/5 border border-violet-500/20 p-3 text-center">
            <Trophy className="size-5 text-violet-500" />
            <div>
              <p className="text-3xl font-bold leading-none brand-text">
                {score != null ? score : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                Opportunity
              </p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              #{index}
            </Badge>
          </div>

          {/* Right: content */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h3 className="font-semibold leading-tight">
                {opp.productTitle || "Untitled Opportunity"}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                {opp.productSource && (
                  <Badge variant="outline" className="text-[10px]">{opp.productSource}</Badge>
                )}
                {opp.confidence != null && (
                  <span className="flex items-center gap-1">
                    <ShieldQuestion className="size-3" />
                    Confidence {opp.confidence}/100
                  </span>
                )}
              </div>
            </div>

            {/* Score grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <ScoreStat label="Trend" value={opp.trendScore} icon={TrendingUp} color="text-emerald-500" />
              <ScoreStat label="Demand" value={opp.demandScore} icon={Target} color="text-violet-500" />
              <ScoreStat label="Competition" value={opp.competitionScore} icon={AlertTriangle} color="text-amber-500" />
              <ScoreStat label="Profit" value={opp.profitScore} icon={DollarSign} color="text-rose-500" />
            </div>

            {opp.aiSummary && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                <span className="font-medium text-foreground">AI summary: </span>
                {opp.aiSummary}
              </p>
            )}

            {opp.risks && opp.risks.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Risks:</span>
                {opp.risks.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-rose-500/5 text-rose-600 dark:text-rose-300 border-rose-500/30">
                    {r}
                  </Badge>
                ))}
              </div>
            )}

            {opp.recommendedAction && (
              <div className="flex items-start gap-2 text-sm rounded-md bg-amber-500/5 border border-amber-500/20 p-2.5">
                <Lightbulb className="size-4 text-amber-500 mt-0.5 shrink-0" />
                <p>
                  <span className="font-medium text-foreground">Recommended: </span>
                  {opp.recommendedAction}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const v = value ?? null;
  return (
    <div className="rounded-md border bg-muted/20 p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Icon className={"size-3 " + color} />
        {label}
      </div>
      <p className="text-base font-bold mt-0.5">{v != null ? v : "—"}</p>
      {v != null && (
        <Progress value={v} className="h-1 mt-1" />
      )}
    </div>
  );
}
