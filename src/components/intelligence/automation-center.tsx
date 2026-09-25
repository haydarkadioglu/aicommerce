"use client";

import { useState, useCallback, useEffect } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { relativeTime } from "@/lib/relative-time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Clock,
  Plus,
  Loader2,
  Workflow,
  Play,
  Trash2,
  TrendingUp,
  Factory,
  DollarSign,
  Users,
  Sparkles,
  FileText,
  Tag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Power,
} from "lucide-react";

type AutomationRun = {
  id: string;
  status: string; // pending | running | completed | failed | cancelled
  result?: string | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

type AutomationRule = {
  id: string;
  name: string;
  description?: string | null;
  workflowType: string;
  config?: string | null;
  scheduleType: string;
  scheduleConfig?: string | null;
  isActive: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
  runs?: AutomationRun[];
};

const WORKFLOW_TYPES: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { value: "trend-scan", label: "Trend Scan", icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
  { value: "supplier-scan", label: "Supplier Scan", icon: Factory, color: "text-amber-500 bg-amber-500/10" },
  { value: "profit-report", label: "Profit Report", icon: DollarSign, color: "text-rose-500 bg-rose-500/10" },
  { value: "competitor-monitor", label: "Competitor Monitor", icon: Users, color: "text-violet-500 bg-violet-500/10" },
  { value: "opportunity-alert", label: "Opportunity Alert", icon: Sparkles, color: "text-violet-500 bg-violet-500/10" },
  { value: "listing-draft", label: "Listing Draft", icon: FileText, color: "text-emerald-500 bg-emerald-500/10" },
  { value: "price-alert", label: "Price Alert", icon: Tag, color: "text-amber-500 bg-amber-500/10" },
];

const SCHEDULE_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "interval", label: "Interval" },
  { value: "manual", label: "Manual" },
];

const RUN_STATUS: Record<
  string,
  { icon: any; color: string; label: string }
> = {
  pending: { icon: Clock, color: "text-amber-500 bg-amber-500/10", label: "Pending" },
  running: { icon: Loader2, color: "text-violet-500 bg-violet-500/10", label: "Running" },
  completed: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10", label: "Completed" },
  failed: { icon: XCircle, color: "text-rose-500 bg-rose-500/10", label: "Failed" },
  cancelled: { icon: AlertTriangle, color: "text-muted-foreground bg-muted", label: "Cancelled" },
};

export function AutomationCenter() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    workflowType: "trend-scan",
    scheduleType: "daily",
    config: "{}",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ rules: AutomationRule[] }>("/api/automation");
      setRules(data.rules || []);
    } catch (err: any) {
      toast({
        title: "Failed to load rules",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const createRule = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    let configParsed: Record<string, unknown> | undefined = undefined;
    const cfgStr = form.config.trim();
    if (cfgStr && cfgStr !== "{}") {
      try {
        configParsed = JSON.parse(cfgStr);
      } catch {
        toast({
          title: "Invalid JSON in config",
          description: "Please paste valid JSON or empty braces {}.",
          variant: "destructive",
        });
        return;
      }
    }
    setCreating(true);
    try {
      const data = await apiFetch<{ rule: AutomationRule }>("/api/automation", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          workflowType: form.workflowType,
          scheduleType: form.scheduleType,
          config: configParsed,
        }),
      });
      setRules((prev) => [data.rule, ...prev]);
      setDialogOpen(false);
      setForm({
        name: "",
        description: "",
        workflowType: "trend-scan",
        scheduleType: "daily",
        config: "{}",
      });
      toast({ title: "Rule created", description: data.rule.name });
    } catch (err: any) {
      toast({
        title: "Create failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleRule = async (rule: AutomationRule) => {
    // optimistic
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
    );
    try {
      await apiFetch(`/api/automation?ruleId=${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "toggle" }),
      });
      toast({
        title: `Rule ${rule.isActive ? "paused" : "activated"}`,
        description: rule.name,
      });
    } catch (err: any) {
      // revert
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isActive: rule.isActive } : r))
      );
      toast({
        title: "Toggle failed",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const runNow = async (rule: AutomationRule) => {
    try {
      const data = await apiFetch<{ run: AutomationRun; message: string }>(
        `/api/automation?ruleId=${rule.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ action: "run-now" }),
        }
      );
      // Prepend the run to this rule's recent runs
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id
            ? {
                ...r,
                lastRunAt: new Date().toISOString(),
                runs: [data.run, ...(r.runs || [])].slice(0, 5),
              }
            : r
        )
      );
      toast({ title: "Rule executed", description: rule.name });
    } catch (err: any) {
      toast({
        title: "Run failed",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const deleteRule = async (rule: AutomationRule) => {
    try {
      await apiFetch(`/api/automation?ruleId=${rule.id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast({ title: "Rule deleted", description: rule.name });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const workflowMeta = (type: string) =>
    WORKFLOW_TYPES.find((w) => w.value === type) || WORKFLOW_TYPES[0];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
            <Workflow className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Automation Center</h2>
            <p className="text-sm text-muted-foreground">
              Schedule recurring scans, reports, and alerts. Run on demand or on a cadence.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient text-white">
              <Plus className="size-4" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
              <DialogDescription>
                Pick a workflow type and schedule. Config is optional workflow-specific JSON.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="rule-name">Name</Label>
                <Input
                  id="rule-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Daily Trend Scan — Handmade Clocks"
                  disabled={creating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rule-desc">Description (optional)</Label>
                <Input
                  id="rule-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What this rule does, in plain English"
                  disabled={creating}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Workflow type</Label>
                  <Select
                    value={form.workflowType}
                    onValueChange={(v) => setForm((f) => ({ ...f, workflowType: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKFLOW_TYPES.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Schedule</Label>
                  <Select
                    value={form.scheduleType}
                    onValueChange={(v) => setForm((f) => ({ ...f, scheduleType: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rule-config">Config JSON (optional)</Label>
                <Textarea
                  id="rule-config"
                  value={form.config}
                  onChange={(e) => setForm((f) => ({ ...f, config: e.target.value }))}
                  placeholder='e.g. { "keyword": "wooden clocks", "limit": 10 }'
                  rows={4}
                  disabled={creating}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={createRule}
                disabled={creating || !form.name.trim()}
                className="brand-gradient text-white"
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Create Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Clock className="size-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">No automation rules yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Click “New Rule” to schedule recurring trend scans, supplier reports, opportunity
              alerts, or any of the 7 workflow types.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 max-h-[800px] overflow-y-auto scroll-thin pr-1">
          {rules.map((rule) => {
            const meta = workflowMeta(rule.workflowType);
            return (
              <AutomationRuleCard
                key={rule.id}
                rule={rule}
                workflowMeta={meta}
                onToggle={() => toggleRule(rule)}
                onRunNow={() => runNow(rule)}
                onDelete={() => deleteRule(rule)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helper components
// ============================================================

function AutomationRuleCard({
  rule,
  workflowMeta,
  onToggle,
  onRunNow,
  onDelete,
}: {
  rule: AutomationRule;
  workflowMeta: { icon: any; color: string; label: string };
  onToggle: () => void;
  onRunNow: () => void;
  onDelete: () => void;
}) {
  const [running, setRunning] = useState(false);
  const Icon = workflowMeta.icon;

  const handleRun = async () => {
    setRunning(true);
    await onRunNow();
    setRunning(false);
  };

  return (
    <Card className={rule.isActive ? "" : "opacity-60"}>
      <CardContent className="p-4 md:p-5 space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className={"flex size-9 items-center justify-center rounded-lg shrink-0 " + workflowMeta.color}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{rule.name}</h3>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {workflowMeta.label}
                </Badge>
                <Badge variant="outline" className="text-[10px] capitalize">
                  <Clock className="size-3 mr-1" />
                  {rule.scheduleType}
                </Badge>
              </div>
              {rule.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {rule.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                {rule.lastRunAt && (
                  <span>Last run: <span className="font-medium text-foreground">{relativeTime(rule.lastRunAt)}</span></span>
                )}
                {rule.nextRunAt && rule.scheduleType !== "manual" && (
                  <span>Next: <span className="font-medium text-foreground">{relativeTime(rule.nextRunAt)}</span></span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Power className={"size-3.5 " + (rule.isActive ? "text-emerald-500" : "text-muted-foreground")} />
              <Switch checked={rule.isActive} onCheckedChange={onToggle} aria-label="Toggle rule" />
            </div>
            <Button size="sm" variant="outline" onClick={handleRun} disabled={running || !rule.isActive}>
              {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              Run Now
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete rule">
              <Trash2 className="size-3.5 text-rose-500" />
            </Button>
          </div>
        </div>

        {/* Config preview */}
        {rule.config && rule.config !== "{}" && (
          <div className="rounded-md bg-muted/30 p-2 text-xs font-mono max-h-24 overflow-y-auto scroll-thin">
            {rule.config}
          </div>
        )}

        {/* Recent runs */}
        {rule.runs && rule.runs.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <Activity className="size-3.5" />
                Recent Runs
              </p>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto scroll-thin pr-1">
                {rule.runs.map((run) => {
                  const c = RUN_STATUS[run.status] || RUN_STATUS.pending;
                  return (
                    <li
                      key={run.id}
                      className="flex items-center gap-2 text-xs rounded-md border bg-muted/20 px-2.5 py-1.5"
                    >
                      <span className={"flex items-center gap-1 rounded px-1.5 py-0.5 font-medium " + c.color}>
                        <c.icon className={"size-3 " + (run.status === "running" ? "animate-spin" : "")} />
                        {c.label}
                      </span>
                      <span className="text-muted-foreground">{relativeTime(run.createdAt)}</span>
                      {run.error && (
                        <span className="truncate text-rose-500">{run.error}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
