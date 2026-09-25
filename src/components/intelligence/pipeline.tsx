"use client";

import { useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/app-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Factory,
  DollarSign,
  Brain,
  Tag,
  FileText,
  Save,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const PIPELINE_STEPS = [
  { key: "research", label: "Research Product", icon: Search },
  { key: "supplier", label: "Supplier Comparison", icon: Factory },
  { key: "profit", label: "Profit Analysis", icon: DollarSign },
  { key: "decision", label: "AI Decision", icon: Brain },
  { key: "seo", label: "SEO Research", icon: Tag },
  { key: "listing", label: "Generate Listing", icon: FileText },
  { key: "save", label: "Save Project", icon: Save },
];

export function Pipeline() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const [query, setQuery] = useState("handcrafted walnut wood wall clock");
  const [running, setRunning] = useState(false);
  const [pipeline, setPipeline] = useState<any>(null);

  const runPipeline = async () => {
    if (!query.trim()) {
      toast({ title: "Enter a product query", variant: "destructive" });
      return;
    }
    setRunning(true);
    setPipeline(null);
    try {
      const data = await apiFetch<{
        pipeline: { query: string; steps: any[]; discoveredProductId: string | null; productData: any };
        meta: { totalSteps: number; completedSteps: number; failedSteps: number };
      }>("/api/pipeline", {
        method: "POST",
        body: JSON.stringify({
          query,
          storeId: activeStoreId || undefined,
        }),
      });
      setPipeline(data.pipeline);
      toast({
        title: `Pipeline complete — ${data.meta.completedSteps}/${data.meta.totalSteps} steps done`,
      });
    } catch (err: any) {
      toast({
        title: "Pipeline failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const steps = pipeline?.steps || [];
  const productData = pipeline?.productData || {};

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
          <Zap className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">One-Click Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Autonomous workflow: Research → Supplier → Profit → Decision → SEO → Listing → Save
          </p>
        </div>
      </div>

      {/* Input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Product to analyze (e.g. handcrafted walnut wood wall clock)"
              className="flex-1 min-w-[200px]"
              onKeyDown={(e) => e.key === "Enter" && runPipeline()}
              disabled={running}
            />
            <Button
              onClick={runPipeline}
              disabled={running || !query.trim()}
              className="brand-gradient text-white"
            >
              {running ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {running ? "Running pipeline…" : "Run Pipeline"}
            </Button>
          </div>
          {activeStoreId && (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-primary" />
              Running with active store context
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pipeline visualization */}
      {running && !pipeline && (
        <Card>
          <CardContent className="py-8 flex flex-col items-center justify-center text-center">
            <Loader2 className="size-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Running pipeline…</p>
          </CardContent>
        </Card>
      )}

      {steps.length > 0 && (
        <div className="space-y-3">
          {steps.map((step: any, i: number) => {
            const stepDef = PIPELINE_STEPS.find((s) => s.key === step.name);
            const Icon = stepDef?.icon || Clock;
            const statusIcon = step.status === "completed" ? CheckCircle2 : step.status === "failed" ? XCircle : step.status === "running" ? Loader2 : Clock;
            const StatusIcon = statusIcon;
            const statusColor = step.status === "completed" ? "text-emerald-500" : step.status === "failed" ? "text-destructive" : step.status === "running" ? "text-primary" : "text-muted-foreground";

            return (
              <div key={i}>
                <Card className={step.status === "completed" ? "border-emerald-500/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${step.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : step.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{stepDef?.label || step.name}</p>
                          <span className={`flex items-center gap-1 text-xs ${statusColor}`}>
                            <StatusIcon className={`size-3.5 ${step.status === "running" ? "animate-spin" : ""}`} />
                            {step.status}
                          </span>
                        </div>
                        {step.error && (
                          <p className="mt-1 text-xs text-destructive">{step.error}</p>
                        )}
                        {step.result && step.status === "completed" && (
                          <div className="mt-2 space-y-2">
                            {/* Render key results */}
                            {step.name === "research" && step.result.trendScore != null && (
                              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {["trendScore", "demandScore", "competitionScore", "opportunityScore", "riskScore"].map((k) => (
                                  <div key={k} className="rounded-md border bg-muted/20 p-2 text-center">
                                    <p className="text-xs text-muted-foreground">{k.replace("Score", "")}</p>
                                    <p className="text-lg font-bold">{step.result[k]}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {step.name === "supplier" && step.result.supplierName && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div><span className="text-muted-foreground">Supplier:</span> {step.result.supplierName}</div>
                                <div><span className="text-muted-foreground">MOQ:</span> {step.result.moq}</div>
                                <div><span className="text-muted-foreground">Cost:</span> ${step.result.unitCostMin}-${step.result.unitCostMax}</div>
                                <div><span className="text-muted-foreground">Score:</span> {step.result.supplierScore}/100</div>
                              </div>
                            )}
                            {step.name === "profit" && step.result.netProfit != null && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div><span className="text-muted-foreground">Net Profit:</span> ${step.result.netProfit}</div>
                                <div><span className="text-muted-foreground">Margin:</span> {step.result.margin}%</div>
                                <div><span className="text-muted-foreground">ROI:</span> {step.result.roi}%</div>
                                <div><span className="text-muted-foreground">Break-even:</span> ${step.result.breakEvenPrice}</div>
                              </div>
                            )}
                            {step.name === "decision" && step.result.verdict && (
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  step.result.verdict === "go" ? "bg-emerald-500/10 text-emerald-500" :
                                  step.result.verdict === "avoid" ? "bg-destructive/10 text-destructive" :
                                  step.result.verdict === "pivot" ? "bg-violet-500/10 text-violet-500" :
                                  "bg-amber-500/10 text-amber-500"
                                }>
                                  {step.result.verdict.toUpperCase()}
                                </Badge>
                                {step.result.confidence != null && <span className="text-xs text-muted-foreground">Confidence: {step.result.confidence}%</span>}
                              </div>
                            )}
                            {step.name === "seo" && step.result.keywords && (
                              <div className="flex flex-wrap gap-1">
                                {step.result.keywords.slice(0, 5).map((k: string, j: number) => (
                                  <Badge key={j} variant="outline" className="text-xs">{k}</Badge>
                                ))}
                              </div>
                            )}
                            {step.name === "listing" && step.result.title && (
                              <div>
                                <p className="text-sm font-medium truncate">{step.result.title}</p>
                                {step.result.tags && <p className="text-xs text-muted-foreground mt-1">{step.result.tags.length} tags generated</p>}
                              </div>
                            )}
                            {step.name === "save" && step.result.productId && (
                              <p className="text-xs text-emerald-500">Product saved to project ✓</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {i < steps.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ChevronRight className="size-4 text-muted-foreground/40 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!running && !pipeline && (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Zap className="size-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">Run the pipeline</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Enter a product query and click "Run Pipeline". The AI will
              autonomously research, compare suppliers, analyze profit, make
              a decision, generate SEO, create a listing, and save the project.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
