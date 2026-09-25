"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Loader2, Cpu, Zap, Clock, Lightbulb } from "lucide-react";

export function ProductResearch() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [idea, setIdea] = useState("Personalized pet memorial gifts for grieving owners");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    content: string;
    model?: string;
    tokensIn?: number;
    tokensOut?: number;
    latencyMs?: number;
  } | null>(null);

  const find = async () => {
    if (!idea.trim()) {
      toast({
        title: "Describe your idea",
        description: "Please describe a product idea or category.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setResult(null);
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
          agentKey: "research",
          message: idea,
        }),
      });
      setResult(data);
    } catch (err: any) {
      toast({
        title: "Research failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
            <Search className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Product Research</h2>
            <p className="text-sm text-muted-foreground">
              Find profitable product opportunities with the Research Agent.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Describe your product idea</CardTitle>
          <CardDescription>
            Enter a category, niche, or specific idea. The agent will surface opportunities, target
            audience, demand signals, and competition level.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. Handmade ceramic mugs for plant lovers, or minimalist gold jewelry"
            rows={4}
            disabled={loading}
          />
          <div className="flex flex-wrap gap-1">
            {[
              "Eco-friendly kitchen products",
              "Personalized pet accessories",
              "Boho wall art prints",
              "Minimalist desk organizers",
            ].map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => !loading && setIdea(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
          <Button
            onClick={find}
            disabled={loading || !idea.trim()}
            className="brand-gradient text-white"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Find Opportunities
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="size-4 animate-spin text-primary" />
              Researching...
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
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="size-4 text-primary" />
                AI Research Report
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
    </div>
  );
}
