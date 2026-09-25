"use client";

import { useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/app-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Crosshair,
  Search,
  Loader2,
  Sparkles,
  TrendingUp,
  Package,
  Store as StoreIcon,
  ChevronRight,
  Zap,
} from "lucide-react";

const SUGGESTIONS = [
  "I want premium dog decor",
  "Luxury brass bee",
  "Minimalist bathroom accessories",
  "Handcrafted walnut wood wall clock",
  "Boho macrame plant hanger",
  "Personalized pet memorial gifts",
];

export function ProductHunter() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const setView = useAppStore((s) => s.setView);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);

  const hunt = async (q?: string) => {
    const search = (q || query).trim();
    if (!search) {
      toast({ title: "Enter a search query", variant: "destructive" });
      return;
    }
    if (!q) setQuery(search);
    setLoading(true);
    setResults([]);
    setIntent(null);
    try {
      const data = await apiFetch<{
        intent: any;
        results: any[];
        meta: any;
      }>("/api/hunter", {
        method: "POST",
        body: JSON.stringify({
          query: search,
          storeId: activeStoreId || undefined,
          limit: 15,
        }),
      });
      setIntent(data.intent);
      setResults(data.results || []);
      toast({
        title: `Found ${data.results.length} products`,
        description: data.intent?.reasoning || `Interpreted as: ${data.intent?.primaryKeyword}`,
      });
    } catch (err: any) {
      toast({
        title: "Hunt failed",
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
          <Crosshair className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Hunter</h2>
          <p className="text-sm text-muted-foreground">
            Search by natural language, keyword, image, or URL. AI finds products across marketplaces.
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. I want premium dog decor, Luxury brass bee, Minimalist bathroom accessories…"
              className="flex-1 min-w-[200px]"
              onKeyDown={(e) => e.key === "Enter" && hunt()}
              disabled={loading}
            />
            <Button
              onClick={() => hunt()}
              disabled={loading || !query.trim()}
              className="brand-gradient text-white"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Hunt
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer hover:bg-accent hover:border-primary/40 transition-colors"
                onClick={() => !loading && hunt(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Intent */}
      {intent && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg brand-gradient text-white shrink-0">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">AI Interpretation</p>
                <p className="text-sm text-muted-foreground">{intent.reasoning}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {intent.primaryKeyword && <Badge variant="secondary">{intent.primaryKeyword}</Badge>}
                  {intent.style && <Badge variant="outline">{intent.style}</Badge>}
                  {intent.material && <Badge variant="outline">{intent.material}</Badge>}
                  {intent.category && <Badge variant="outline">{intent.category}</Badge>}
                </div>
                {intent.expandedKeywords && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Expanded keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {intent.expandedKeywords.map((k: string, i: number) => (
                        <span key={i} className="text-xs rounded bg-muted px-1.5 py-0.5">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Crosshair className="size-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">No products yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Describe what you're looking for in natural language. The AI will
              interpret your intent and search across Etsy, Alibaba, 1688, Amazon,
              Pinterest, Google Trends, and TikTok.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Discovered ({results.length})
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setView("pipeline")}
            >
              <Sparkles className="size-4" />
              Run Pipeline
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((product, i) => (
              <Card
                key={i}
                className="group hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <span className="flex size-8 items-center justify-center rounded-md brand-gradient text-white text-[10px] font-bold shrink-0">
                      {product.source?.slice(0, 3).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {product.price != null && (
                          <span className="font-medium">${product.price.toFixed(2)} {product.currency}</span>
                        )}
                        <span>· {product.source}</span>
                      </div>
                      {product.category && (
                        <Badge variant="outline" className="mt-1 text-xs">{product.category}</Badge>
                      )}
                    </div>
                  </div>
                  {product.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                  {product.dbId && (
                    <div className="mt-2 flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 text-xs"
                        onClick={() => setView("pipeline")}
                      >
                        Analyze <ChevronRight className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 text-xs brand-gradient text-white"
                        onClick={() => setView("pipeline")}
                      >
                        <Zap className="size-3" /> Pipeline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
