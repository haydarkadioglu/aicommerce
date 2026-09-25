"use client";

import { useState, useCallback } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Search,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Factory,
  Users,
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Lightbulb,
} from "lucide-react";

type DiscoveredProduct = {
  dbId: string | null;
  source: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  price?: number;
  currency?: string;
  sourceUrl?: string;
  tags?: string[];
  metadata?: Record<string, any>;
};

type AnalysisResult = {
  [key: string]: any;
  meta: {
    model: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
  };
};

const SOURCE_COLORS: Record<string, string> = {
  etsy: "bg-orange-500/10 text-orange-500",
  alibaba: "bg-blue-500/10 text-blue-500",
  "1688": "bg-red-500/10 text-red-500",
  amazon: "bg-amber-500/10 text-amber-500",
  pinterest: "bg-rose-500/10 text-rose-500",
  "google-trends": "bg-emerald-500/10 text-emerald-500",
  tiktok: "bg-violet-500/10 text-violet-500",
};

export function ProductIntelligence() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("handcrafted walnut wood wall clock");
  const [mode, setMode] = useState("keyword");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DiscoveredProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<DiscoveredProduct | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) {
      toast({ title: "Enter a search query", variant: "destructive" });
      return;
    }
    setSearching(true);
    setResults([]);
    setSelectedProduct(null);
    setAnalyses({});
    try {
      const data = await apiFetch<{
        results: DiscoveredProduct[];
        meta: { totalFound: number; persisted: number; latencyMs: number };
      }>("/api/discover", {
        method: "POST",
        body: JSON.stringify({
          query,
          mode,
          limit: 15,
          persist: true,
        }),
      });
      setResults(data.results || []);
      toast({
        title: `Found ${data.results.length} products`,
        description: `Searched ${data.meta.totalFound} sources in ${data.meta.latencyMs}ms`,
      });
    } catch (err: any) {
      toast({
        title: "Discovery failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const runAnalysis = async (analysisType: string) => {
    if (!selectedProduct?.dbId) return;
    setAnalyzing(analysisType);
    try {
      const data = await apiFetch<{
        analysis: any;
        savedRecordId: string | null;
        meta: { model: string; tokensIn: number; tokensOut: number; latencyMs: number };
      }>("/api/intelligence", {
        method: "POST",
        body: JSON.stringify({
          discoveredProductId: selectedProduct.dbId,
          analysisType,
        }),
      });
      setAnalyses((prev) => ({
        ...prev,
        [analysisType]: { ...data.analysis, meta: data.meta },
      }));
      toast({ title: `${analysisType} complete` });
    } catch (err: any) {
      toast({
        title: "Analysis failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
          <Brain className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Intelligence</h2>
          <p className="text-sm text-muted-foreground">
            Discover, analyze, and decide — one connected intelligence platform.
          </p>
        </div>
      </div>

      {/* Search bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discover Products</CardTitle>
          <CardDescription>
            Search across Etsy, Alibaba, 1688, Amazon, Pinterest, Google Trends, and TikTok.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Keyword</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="trend">Trend</SelectItem>
                <SelectItem value="style">Style</SelectItem>
                <SelectItem value="material">Material</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter keyword, product name, URL, or trend…"
              className="flex-1 min-w-[200px]"
              onKeyDown={(e) => e.key === "Enter" && search()}
              disabled={searching}
            />
            <Button
              onClick={search}
              disabled={searching || !query.trim()}
              className="brand-gradient text-white"
            >
              {searching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Discover
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: results list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Discovered ({results.length})
            </h3>
            {results.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {new Set(results.map((r) => r.source)).size} sources
              </Badge>
            )}
          </div>

          {searching ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <Search className="size-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No products discovered yet. Enter a query above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2 max-h-[600px] overflow-y-auto scroll-thin pr-1">
              {results.map((product, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setAnalyses({});
                    }}
                    className={
                      "group w-full text-left rounded-md border p-3 transition-all " +
                      (selectedProduct === product
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/40 hover:bg-accent/30")
                    }
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={
                          "flex size-6 items-center justify-center rounded text-[10px] font-bold shrink-0 " +
                          (SOURCE_COLORS[product.source] || "bg-muted text-muted-foreground")
                        }
                      >
                        {product.source.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{product.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {product.price != null && (
                            <span>${product.price.toFixed(2)} {product.currency}</span>
                          )}
                          {product.category && <span>· {product.category}</span>}
                        </div>
                      </div>
                      {selectedProduct === product && (
                        <ChevronRight className="size-4 text-primary shrink-0" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: analysis panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedProduct ? (
            <Card className="border-dashed">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <Brain className="size-12 text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-semibold">Select a product to analyze</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Run AI-powered analysis: trend scores, supplier intelligence,
                  competitor analysis, profit estimation, and business decisions.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Product header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        "flex size-10 items-center justify-center rounded-lg text-xs font-bold shrink-0 " +
                        (SOURCE_COLORS[selectedProduct.source] || "bg-muted text-muted-foreground")
                      }
                    >
                      {selectedProduct.source.slice(0, 3).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{selectedProduct.title}</h3>
                      {selectedProduct.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {selectedProduct.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {selectedProduct.price != null && (
                          <span className="font-medium">
                            ${selectedProduct.price.toFixed(2)} {selectedProduct.currency}
                          </span>
                        )}
                        {selectedProduct.sourceUrl && (
                          <a
                            href={selectedProduct.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            Source <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analysis actions */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <AnalysisButton
                  label="Product Analysis"
                  icon={Target}
                  color="text-violet-500 bg-violet-500/10"
                  onClick={() => runAnalysis("product-analysis")}
                  loading={analyzing === "product-analysis"}
                />
                <AnalysisButton
                  label="Supplier Intel"
                  icon={Factory}
                  color="text-blue-500 bg-blue-500/10"
                  onClick={() => runAnalysis("supplier")}
                  loading={analyzing === "supplier"}
                />
                <AnalysisButton
                  label="Competitor"
                  icon={Users}
                  color="text-amber-500 bg-amber-500/10"
                  onClick={() => runAnalysis("competitor")}
                  loading={analyzing === "competitor"}
                />
                <AnalysisButton
                  label="Trend"
                  icon={TrendingUp}
                  color="text-emerald-500 bg-emerald-500/10"
                  onClick={() => runAnalysis("trend")}
                  loading={analyzing === "trend"}
                />
                <AnalysisButton
                  label="Profit"
                  icon={DollarSign}
                  color="text-rose-500 bg-rose-500/10"
                  onClick={() => runAnalysis("profit")}
                  loading={analyzing === "profit"}
                />
                <AnalysisButton
                  label="Decision"
                  icon={Brain}
                  color="text-primary bg-primary/10"
                  onClick={() => runAnalysis("decision")}
                  loading={analyzing === "decision"}
                />
              </div>

              {/* Analysis results */}
              {analyses["product-analysis"] && (
                <AnalysisCard title="Product Analysis" icon={Target}>
                  <ScoreGrid
                    scores={{
                      Trend: analyses["product-analysis"].trendScore,
                      Demand: analyses["product-analysis"].demandScore,
                      Competition: analyses["product-analysis"].competitionScore,
                      Opportunity: analyses["product-analysis"].opportunityScore,
                      Risk: analyses["product-analysis"].riskScore,
                    }}
                  />
                  <Separator className="my-3" />
                  <FinancialGrid
                    data={{
                      "Est. Monthly Sales": analyses["product-analysis"].estimatedMonthlySales,
                      "Est. Revenue": analyses["product-analysis"].estimatedRevenue
                        ? `$${analyses["product-analysis"].estimatedRevenue.toLocaleString()}`
                        : null,
                      "Est. Profit": analyses["product-analysis"].estimatedProfit
                        ? `$${analyses["product-analysis"].estimatedProfit.toLocaleString()}`
                        : null,
                      ROI: analyses["product-analysis"].estimatedRoi
                        ? `${analyses["product-analysis"].estimatedRoi}%`
                        : null,
                      Margin: analyses["product-analysis"].estimatedMargin
                        ? `${analyses["product-analysis"].estimatedMargin}%`
                        : null,
                      "Suggested Price": analyses["product-analysis"].suggestedPrice
                        ? `$${analyses["product-analysis"].suggestedPrice.toFixed(2)}`
                        : null,
                      "Avg Market Price": analyses["product-analysis"].averageMarketPrice
                        ? `$${analyses["product-analysis"].averageMarketPrice.toFixed(2)}`
                        : null,
                      Saturation: analyses["product-analysis"].marketSaturation,
                    }}
                  />
                  {analyses["product-analysis"].reasoning && (
                    <div className="mt-3 rounded-md bg-muted/30 p-3 text-sm">
                      <p className="font-medium mb-1">AI Reasoning</p>
                      <p className="text-muted-foreground">
                        {analyses["product-analysis"].reasoning}
                      </p>
                    </div>
                  )}
                  <RecommendationsList
                    recs={analyses["product-analysis"].recommendations}
                  />
                </AnalysisCard>
              )}

              {analyses["supplier"] && (
                <AnalysisCard title="Supplier Intelligence" icon={Factory}>
                  <FinancialGrid
                    data={{
                      "Supplier Name": analyses["supplier"].supplierName,
                      Type: analyses["supplier"].supplierType,
                      Country: analyses["supplier"].country,
                      MOQ: analyses["supplier"].moq,
                      "Unit Cost": analyses["supplier"].unitCostMin
                        ? `$${analyses["supplier"].unitCostMin}-${analyses["supplier"].unitCostMax}`
                        : null,
                      "Lead Time": analyses["supplier"].leadTimeDays
                        ? `${analyses["supplier"].leadTimeDays} days`
                        : null,
                      "Reliability": analyses["supplier"].reliabilityScore
                        ? `${analyses["supplier"].reliabilityScore}/100`
                        : null,
                      "Supplier Score": analyses["supplier"].supplierScore
                        ? `${analyses["supplier"].supplierScore}/100`
                        : null,
                    }}
                  />
                  <div className="flex gap-2 mt-3">
                    {analyses["supplier"].tradeAssurance && (
                      <Badge variant="outline" className="text-emerald-500">Trade Assurance</Badge>
                    )}
                    {analyses["supplier"].goldSupplier && (
                      <Badge variant="outline" className="text-amber-500">Gold Supplier</Badge>
                    )}
                  </div>
                  <RecommendationsList recs={analyses["supplier"].recommendations} />
                </AnalysisCard>
              )}

              {analyses["competitor"] && (
                <AnalysisCard title="Competitor Intelligence" icon={Users}>
                  <FinancialGrid
                    data={{
                      Shop: analyses["competitor"].shopName,
                      "Listing Price": analyses["competitor"].listingPrice
                        ? `$${analyses["competitor"].listingPrice}`
                        : null,
                      "Pricing Score": analyses["competitor"].pricingScore
                        ? `${analyses["competitor"].pricingScore}/100`
                        : null,
                      "Listing Quality": analyses["competitor"].listingQualityScore
                        ? `${analyses["competitor"].listingQualityScore}/100`
                        : null,
                      "SEO Score": analyses["competitor"].seoScore
                        ? `${analyses["competitor"].seoScore}/100`
                        : null,
                      "Image Score": analyses["competitor"].imageScore
                        ? `${analyses["competitor"].imageScore}/100`
                        : null,
                    }}
                  />
                  {analyses["competitor"].positioning && (
                    <div className="mt-3 rounded-md bg-muted/30 p-3 text-sm">
                      <p className="font-medium mb-1">Positioning</p>
                      <p className="text-muted-foreground">
                        {analyses["competitor"].positioning}
                      </p>
                    </div>
                  )}
                  <RecommendationsList recs={analyses["competitor"].recommendations} />
                </AnalysisCard>
              )}

              {analyses["trend"] && (
                <AnalysisCard title="Trend Intelligence" icon={TrendingUp}>
                  <div className="flex items-center gap-3">
                    <MomentumBadge momentum={analyses["trend"].momentum} />
                    {analyses["trend"].trendScore != null && (
                      <ScoreBar label="Trend Score" value={analyses["trend"].trendScore} />
                    )}
                    {analyses["trend"].confidenceScore != null && (
                      <ScoreBar label="Confidence" value={analyses["trend"].confidenceScore} />
                    )}
                  </div>
                  {analyses["trend"].reasoning && (
                    <div className="mt-3 rounded-md bg-muted/30 p-3 text-sm">
                      <p className="text-muted-foreground">{analyses["trend"].reasoning}</p>
                    </div>
                  )}
                  {analyses["trend"].recommendedAction && (
                    <div className="mt-2 flex items-start gap-2 text-sm">
                      <Lightbulb className="size-4 text-amber-500 mt-0.5 shrink-0" />
                      <p>{analyses["trend"].recommendedAction}</p>
                    </div>
                  )}
                </AnalysisCard>
              )}

              {analyses["decision"] && (
                <AnalysisCard title="AI Decision" icon={Brain}>
                  <div className="flex items-center gap-3">
                    <VerdictBadge verdict={analyses["decision"].verdict} />
                    {analyses["decision"].confidence != null && (
                      <ScoreBar label="Confidence" value={analyses["decision"].confidence} />
                    )}
                  </div>
                  {analyses["decision"].reasoning && (
                    <div className="mt-3 rounded-md bg-muted/30 p-3 text-sm">
                      <p className="text-muted-foreground">
                        {analyses["decision"].reasoning}
                      </p>
                    </div>
                  )}
                  {analyses["decision"].nextAction && (
                    <div className="mt-2 flex items-start gap-2 text-sm">
                      <Target className="size-4 text-primary mt-0.5 shrink-0" />
                      <p>
                        <span className="font-medium">Next action: </span>
                        {analyses["decision"].nextAction}
                      </p>
                    </div>
                  )}
                </AnalysisCard>
              )}

              {analyzing && !analyses[analyzing] && (
                <Card>
                  <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    <span className="text-sm">Running {analyzing} analysis…</span>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helper components
// ============================================================

function AnalysisButton({
  label,
  icon: Icon,
  color,
  onClick,
  loading,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left transition-all hover:border-primary/40 hover:bg-accent/30 disabled:opacity-50"
    >
      <span className={"flex size-7 items-center justify-center rounded " + color}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function AnalysisCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ScoreGrid({ scores }: { scores: Record<string, number | undefined> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {Object.entries(scores).map(([label, value]) => (
        <div key={label} className="rounded-md border bg-muted/20 p-2 text-center">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">
            {value != null ? value : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

function FinancialGrid({ data }: { data: Record<string, any> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {Object.entries(data).map(([label, value]) => (
        <div key={label} className="rounded-md border bg-muted/20 p-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold mt-0.5 truncate">
            {value != null && value !== undefined ? String(value) : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

function RecommendationsList({ recs }: { recs: string[] | undefined }) {
  if (!recs || recs.length === 0) return null;
  return (
    <div className="mt-3 space-y-1">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        Recommendations
      </p>
      {recs.map((rec, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
          <span>{rec}</span>
        </div>
      ))}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function MomentumBadge({ momentum }: { momentum: string }) {
  const config: Record<string, { icon: any; color: string; label: string }> = {
    rising: { icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10", label: "Rising" },
    declining: { icon: TrendingDown, color: "text-rose-500 bg-rose-500/10", label: "Declining" },
    stable: { icon: Minus, color: "text-muted-foreground bg-muted", label: "Stable" },
  };
  const c = config[momentum] || config.stable;
  return (
    <span className={"flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium " + c.color}>
      <c.icon className="size-3" />
      {c.label}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const config: Record<string, { icon: any; color: string; label: string }> = {
    go: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10", label: "GO" },
    hold: { icon: Clock, color: "text-amber-500 bg-amber-500/10", label: "HOLD" },
    avoid: { icon: XCircle, color: "text-rose-500 bg-rose-500/10", label: "AVOID" },
    pivot: { icon: AlertTriangle, color: "text-violet-500 bg-violet-500/10", label: "PIVOT" },
  };
  const c = config[verdict] || config.hold;
  return (
    <span className={"flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-bold " + c.color}>
      <c.icon className="size-4" />
      {c.label}
    </span>
  );
}
