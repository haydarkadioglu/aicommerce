"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Package,
  DollarSign,
  Factory,
  Users,
  Search,
  FileText,
  Sparkles,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Database,
} from "lucide-react";

type ReportType = {
  type: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const REPORT_TYPES: ReportType[] = [
  {
    type: "products",
    title: "Products",
    description: "Discovered products across all sources — Etsy, Alibaba, 1688, Amazon, Pinterest, Google Trends, TikTok.",
    icon: Package,
    accent: "text-emerald-500",
  },
  {
    type: "profit",
    title: "Profit",
    description: "Profit calculations — cost breakdowns, suggested prices, ROI, margin, break-even.",
    icon: DollarSign,
    accent: "text-rose-500",
  },
  {
    type: "suppliers",
    title: "Suppliers",
    description: "Supplier intelligence reports — MOQ, unit costs, lead times, reliability scores.",
    icon: Factory,
    accent: "text-amber-500",
  },
  {
    type: "competitors",
    title: "Competitors",
    description: "Competitor reports — pricing scores, listing quality, SEO scores, image scores.",
    icon: Users,
    accent: "text-violet-500",
  },
  {
    type: "seo",
    title: "SEO",
    description: "SEO analyses tied to listings — scores, readability, search visibility estimates.",
    icon: Search,
    accent: "text-violet-500",
  },
  {
    type: "listings",
    title: "Listings",
    description: "AI-generated current listings — marketplace, style, room, occasion, holiday, tags.",
    icon: FileText,
    accent: "text-emerald-500",
  },
  {
    type: "opportunities",
    title: "Opportunities",
    description: "Opportunity scans — ranked opportunities with trend, demand, competition, profit scores.",
    icon: Sparkles,
    accent: "text-amber-500",
  },
];

export function ExportCenter() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const exportReport = async (type: string, format: "csv" | "json") => {
    const key = `${type}-${format}`;
    setBusy(key);
    try {
      // Use window.open so the browser handles the download / file save dialog.
      // This goes through the gateway directly — no XTransformPort needed.
      const url = `/api/export?type=${encodeURIComponent(type)}&format=${format}`;
      window.open(url, "_blank");
      toast({
        title: `Exporting ${type} (${format.toUpperCase()})`,
        description: "If the download doesn't start, make sure you're signed in.",
      });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      // Small visual delay so the spinner shows briefly
      setTimeout(() => setBusy(null), 600);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
          <Download className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Export Center</h2>
          <p className="text-sm text-muted-foreground">
            Download any data layer as CSV (spreadsheet) or JSON (raw).
          </p>
        </div>
      </div>

      {/* Info banner */}
      <Card className="border-violet-500/30 bg-violet-500/5">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <Database className="size-4 text-violet-500 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Exports are scoped to your account, capped at 500 rows per report. CSV follows
            RFC-4180 quoting rules; JSON includes the report type, export timestamp, and row count.
          </p>
        </CardContent>
      </Card>

      {/* Grid of report types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((r) => {
          const Icon = r.icon;
          const csvBusy = busy === `${r.type}-csv`;
          const jsonBusy = busy === `${r.type}-json`;
          return (
            <Card
              key={r.type}
              className="group transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-violet-500/40"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg brand-gradient text-white shrink-0">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {r.title}
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {r.type}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {r.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportReport(r.type, "csv")}
                    disabled={csvBusy || jsonBusy}
                  >
                    {csvBusy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="size-3.5" />
                    )}
                    Export CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportReport(r.type, "json")}
                    disabled={csvBusy || jsonBusy}
                    className="border-violet-500/30 hover:border-violet-500/60 hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-300"
                  >
                    {jsonBusy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileJson className="size-3.5" />
                    )}
                    Export JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
