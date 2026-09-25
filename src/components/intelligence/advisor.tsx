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
  Lightbulb,
  Loader2,
  Sparkles,
  Brain,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Target,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  ArrowRight,
  Cpu,
} from "lucide-react";

type Advice = {
  verdict?: "go" | "hold" | "avoid" | "pivot" | string;
  confidence?: number;
  reasoning?: string;
  advantages?: string[];
  disadvantages?: string[];
  risks?: string[];
  nextActions?: string[];
  businessExplanation?: string;
  rawContent?: string;
  parseError?: boolean;
};

type AdvisorResponse = {
  advice: Advice;
  meta: { model: string; tokensIn: number; tokensOut: number; latencyMs: number };
};

const SUGGESTIONS: { label: string; question: string }[] = [
  {
    label: "Launch product?",
    question: "Should I launch this product?",
  },
  {
    label: "Market saturated?",
    question: "Is the market saturated?",
  },
  {
    label: "Change supplier?",
    question: "Should I change supplier?",
  },
  {
    label: "Raise price?",
    question: "Should I raise price?",
  },
  {
    label: "Bundle products?",
    question: "Should I bundle products?",
  },
  {
    label: "Stop selling?",
    question: "Should I stop selling this?",
  },
];

export function AdvisorModule() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [discoveredProductId, setDiscoveredProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [meta, setMeta] = useState<AdvisorResponse["meta"] | null>(null);

  const ask = useCallback(
    async (overrideQuestion?: string) => {
      const q = (overrideQuestion ?? question).trim();
      if (q.length < 5) {
        toast({
          title: "Question too short",
          description: "Please enter at least 5 characters.",
          variant: "destructive",
        });
        return;
      }
      setLoading(true);
      setAdvice(null);
      setMeta(null);
      try {
        const data = await apiFetch<AdvisorResponse>("/api/advisor", {
          method: "POST",
          body: JSON.stringify({
            question: q,
            discoveredProductId: discoveredProductId.trim() || undefined,
          }),
        });
        setAdvice(data.advice);
        setMeta(data.meta);
        toast({
          title: "Advisor verdict ready",
          description: `${data.advice?.verdict?.toUpperCase() ?? "—"} · ${data.meta.latencyMs}ms`,
        });
      } catch (err: any) {
        toast({
          title: "Advisor failed",
          description: err?.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, toast, question, discoveredProductId]
  );

  const applySuggestion = (s: (typeof SUGGESTIONS)[number]) => {
    setQuestion(s.question);
    ask(s.question);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
          <Lightbulb className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Business Advisor</h2>
          <p className="text-sm text-muted-foreground">
            Ask any business question — get a verdict, reasoning, and a concrete next action.
          </p>
        </div>
      </div>

      {/* Input card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-4 text-violet-500" />
            Ask the Advisor
          </CardTitle>
          <CardDescription>
            Optional: paste a Discovered Product ID to let the advisor pull real intelligence
            (analyses, supplier reports, profit calc, competitor data) before answering.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="advisor-question">Your question</Label>
            <Textarea
              id="advisor-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Should I launch this product? Is the market saturated? Should I raise the price?"
              rows={3}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="advisor-product-id">Discovered Product ID (optional)</Label>
            <Input
              id="advisor-product-id"
              value={discoveredProductId}
              onChange={(e) => setDiscoveredProductId(e.target.value)}
              placeholder="e.g. ckgxxxxxxxxxxxxxxxxxxx"
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {question.length}/1000 chars · ⌘/Ctrl+Enter to submit
            </span>
            <Button
              onClick={() => ask()}
              disabled={loading || question.trim().length < 5}
              className="brand-gradient text-white"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Ask Advisor
            </Button>
          </div>

          {/* Suggestion chips */}
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Quick questions
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  disabled={loading}
                  className="rounded-full border border-violet-500/30 bg-violet-500/5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-300 transition-all hover:bg-violet-500/15 hover:border-violet-500/50 disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-violet-500" />
            <span className="text-sm">Consulting advisor across all intelligence layers…</span>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {!loading && advice && (
        <AdvisorResultCard advice={advice} meta={meta} />
      )}

      {/* Empty state */}
      {!loading && !advice && (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Lightbulb className="size-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">No verdict yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Type a question above or pick a quick suggestion to get a structured business
              recommendation with verdict, confidence, advantages, risks, and next actions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Helper components
// ============================================================

function AdvisorResultCard({
  advice,
  meta,
}: {
  advice: Advice;
  meta: AdvisorResponse["meta"] | null;
}) {
  if (advice.parseError) {
    return (
      <Card className="border-amber-500/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-500" />
            Advisor returned an unexpected response
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            The AI could not return structured JSON. Raw response below.
          </p>
          <pre className="max-h-96 overflow-y-auto scroll-thin rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
            {advice.rawContent || "No content"}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <VerdictBadge verdict={advice.verdict} />
          {advice.confidence != null && (
            <ScoreBar label="Confidence" value={advice.confidence} />
          )}
          {meta && (
            <Badge variant="outline" className="ml-auto text-xs">
              <Cpu className="size-3 mr-1" />
              {meta.model} · {meta.latencyMs}ms
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reasoning */}
        {advice.reasoning && (
          <AnalysisSection title="Reasoning" icon={Brain}>
            <p className="text-sm text-muted-foreground">{advice.reasoning}</p>
          </AnalysisSection>
        )}

        {/* Pros + Cons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnalysisSection title="Advantages" icon={ThumbsUp} accent="emerald">
            <ListBlock items={advice.advantages} icon={CheckCircle2} color="text-emerald-500" />
          </AnalysisSection>
          <AnalysisSection title="Disadvantages" icon={ThumbsDown} accent="rose">
            <ListBlock items={advice.disadvantages} icon={XCircle} color="text-rose-500" />
          </AnalysisSection>
        </div>

        {/* Risks */}
        {advice.risks && advice.risks.length > 0 && (
          <AnalysisSection title="Risks" icon={ShieldAlert} accent="amber">
            <ListBlock items={advice.risks} icon={AlertTriangle} color="text-amber-500" />
          </AnalysisSection>
        )}

        {/* Next actions */}
        {advice.nextActions && advice.nextActions.length > 0 && (
          <AnalysisSection title="Next Actions" icon={Target} accent="violet">
            <ul className="space-y-1.5">
              {advice.nextActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="flex size-5 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </AnalysisSection>
        )}

        {advice.businessExplanation && (
          <>
            <Separator />
            <div className="rounded-md bg-violet-500/5 border border-violet-500/20 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300 mb-1">
                <ArrowRight className="size-3.5" />
                Plain-English Summary
              </p>
              <p className="text-sm">{advice.businessExplanation}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisSection({
  title,
  icon: Icon,
  accent = "violet",
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "violet" | "emerald" | "rose" | "amber";
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    violet: "text-violet-500",
    emerald: "text-emerald-500",
    rose: "text-rose-500",
    amber: "text-amber-500",
  };
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className={"flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2 " + colors[accent]}>
        <Icon className="size-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}

function ListBlock({
  items,
  icon: Icon,
  color,
}: {
  items?: string[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No items</p>;
  }
  return (
    <ul className="space-y-1.5 max-h-64 overflow-y-auto scroll-thin pr-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <Icon className={"size-4 mt-0.5 shrink-0 " + color} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict?: string }) {
  const config: Record<string, { icon: any; color: string; label: string }> = {
    go: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10", label: "GO" },
    hold: { icon: Clock, color: "text-amber-500 bg-amber-500/10", label: "HOLD" },
    avoid: { icon: XCircle, color: "text-rose-500 bg-rose-500/10", label: "AVOID" },
    pivot: { icon: AlertTriangle, color: "text-violet-500 bg-violet-500/10", label: "PIVOT" },
  };
  const c = config[verdict || ""] || { icon: Clock, color: "text-muted-foreground bg-muted", label: (verdict || "—").toUpperCase() };
  return (
    <span className={"flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-bold " + c.color}>
      <c.icon className="size-4" />
      {c.label}
    </span>
  );
}
