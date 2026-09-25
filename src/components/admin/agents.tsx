"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Bot, RefreshCw, Loader2 } from "lucide-react";

type Agent = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  defaultModel: string | null;
  systemPromptKey: string | null;
  capabilities: string | null;
  isActive: boolean;
};

export function AdminAgents() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ agents: Agent[] }>("/api/admin/agents");
      setAgents(data.agents || []);
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

  const toggleActive = async (agent: Agent, next: boolean) => {
    setSaving(agent.id);
    try {
      await apiFetch(`/api/admin/agents?agentId=${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: next }),
      });
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, isActive: next } : a))
      );
      toast({
        title: `${agent.name} ${next ? "activated" : "deactivated"}`,
      });
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Group by category
  const grouped = agents.reduce<Record<string, Agent[]>>((acc, a) => {
    (acc[a.category] = acc[a.category] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Agents</h2>
          <p className="text-sm text-muted-foreground">
            Specialized agents available in the orchestrator.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {cat}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((a) => (
                  <Card key={a.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              "flex size-9 items-center justify-center rounded-lg " +
                              (a.isActive
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground")
                            }
                          >
                            <Bot className="size-4" />
                          </span>
                          <div>
                            <CardTitle className="text-base">{a.name}</CardTitle>
                            <p className="text-xs text-muted-foreground font-mono">{a.key}</p>
                          </div>
                        </div>
                        <Switch
                          checked={a.isActive}
                          onCheckedChange={(v) => toggleActive(a, v)}
                          disabled={saving === a.id}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2">
                      {a.description && (
                        <CardDescription>{a.description}</CardDescription>
                      )}
                      <div className="space-y-1 text-xs">
                        {a.defaultModel && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Default model</span>
                            <span className="font-mono">{a.defaultModel}</span>
                          </div>
                        )}
                        {a.systemPromptKey && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Prompt key</span>
                            <span className="font-mono">{a.systemPromptKey}</span>
                          </div>
                        )}
                      </div>
                      {a.capabilities && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {a.capabilities.split(",").map((c) => (
                            <Badge key={c} variant="outline" className="text-[10px]">
                              {c.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {saving === a.id && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="size-3 animate-spin" /> Saving…
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
