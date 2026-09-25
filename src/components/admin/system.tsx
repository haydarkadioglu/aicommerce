"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ServerCog, RefreshCw, Trash2, Loader2, Cpu, Coins, Zap, Users, Bot, FileText, ListChecks, ScrollText, Activity } from "lucide-react";

type SystemInfo = {
  system: {
    version: string;
    status: string;
    uptime: number;
    memory: { rss: number; heapUsed: number; heapTotal: number };
    timestamp: string;
  };
  counts: {
    users: number;
    activeProviders: number;
    activeAgents: number;
    activePrompts: number;
  };
  today: {
    calls: number;
    tokens: number;
    costUsd: number;
    failedCalls: number;
  };
  jobs: {
    failed: number;
    queued: number;
    running: number;
  };
  logs: {
    auditLast24h: number;
    errorsLast24h: number;
  };
  database: {
    type: string;
    path: string | null;
  };
};

export function AdminSystem() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [data, setData] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<SystemInfo>("/api/admin/system");
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

  const clearCache = async () => {
    setClearing(true);
    try {
      await apiFetch("/api/admin/system", {
        method: "POST",
        body: JSON.stringify({ action: "clear-cache" }),
      });
      toast({ title: "Provider cache cleared" });
      load();
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const s = data.system;
  const memMb = (s.memory.heapUsed / 1024 / 1024).toFixed(1);
  const memTotalMb = (s.memory.heapTotal / 1024 / 1024).toFixed(1);
  const uptimeH = Math.floor(s.uptime / 3600);
  const uptimeM = Math.floor((s.uptime % 3600) / 60);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Status</h2>
          <p className="text-sm text-muted-foreground">
            Platform health, resources, and quick actions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
            disabled={clearing}
          >
            {clearing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Clear cache
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status banner */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
            <ServerCog className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">All systems operational</p>
            <p className="text-xs text-muted-foreground">
              v{s.version} · up {uptimeH}h {uptimeM}m · {new Date(s.timestamp).toLocaleString()}
            </p>
          </div>
          <Badge className="ml-auto bg-emerald-500/80 text-white border-transparent">
            {s.status}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Users" value={data.counts.users} icon={<Users className="size-4" />} />
        <Stat label="Active providers" value={data.counts.activeProviders} icon={<Cpu className="size-4" />} />
        <Stat label="Active agents" value={data.counts.activeAgents} icon={<Bot className="size-4" />} />
        <Stat label="Active prompts" value={data.counts.activePrompts} icon={<FileText className="size-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s AI Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Calls" value={data.today.calls} icon={<Activity className="size-3.5" />} />
            <Row label="Tokens" value={data.today.tokens.toLocaleString()} icon={<Zap className="size-3.5" />} />
            <Row label="Cost" value={`$${data.today.costUsd.toFixed(4)}`} icon={<Coins className="size-3.5" />} />
            <Row
              label="Failed calls"
              value={data.today.failedCalls}
              icon={<Activity className="size-3.5" />}
              danger={data.today.failedCalls > 0}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Queued" value={data.jobs.queued} icon={<ListChecks className="size-3.5" />} />
            <Row label="Running" value={data.jobs.running} icon={<ListChecks className="size-3.5" />} />
            <Row
              label="Failed"
              value={data.jobs.failed}
              icon={<ListChecks className="size-3.5" />}
              danger={data.jobs.failed > 0}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs (24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Audit events" value={data.logs.auditLast24h} icon={<ScrollText className="size-3.5" />} />
            <Row
              label="Errors"
              value={data.logs.errorsLast24h}
              icon={<ScrollText className="size-3.5" />}
              danger={data.logs.errorsLast24h > 0}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runtime</CardTitle>
          <CardDescription>Process & database information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <Info label="Memory (heap)">
              {memMb} MB / {memTotalMb} MB
            </Info>
            <Info label="Uptime">
              {uptimeH}h {uptimeM}m
            </Info>
            <Info label="Database">{data.database.type}</Info>
            <Info label="Version">{s.version}</Info>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
        </div>
        <div className="mt-2 text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={"font-semibold " + (danger ? "text-destructive" : "")}>
        {value}
      </span>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-mono mt-1">{children}</p>
    </div>
  );
}
