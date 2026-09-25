"use client";

import { useEffect, useState, useCallback } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Plus,
  Trash2,
  Loader2,
  Search,
  Clock,
  AlertTriangle,
  Lightbulb,
  Target,
  RefreshCw,
} from "lucide-react";

type Memory = {
  id: string;
  agentKey: string | null;
  scope: string;
  kind: string;
  content: string;
  importance: number;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
};

const KIND_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  fact: { icon: Lightbulb, color: "text-amber-500 bg-amber-500/10", label: "Fact" },
  preference: { icon: Target, color: "text-violet-500 bg-violet-500/10", label: "Preference" },
  project: { icon: Brain, color: "text-emerald-500 bg-emerald-500/10", label: "Project" },
  context: { icon: Clock, color: "text-sky-500 bg-sky-500/10", label: "Context" },
};

export function MemoryBrowser() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [memory, setMemory] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");

  // New memory dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newKind, setNewKind] = useState("fact");
  const [newAgentKey, setNewAgentKey] = useState("");
  const [newImportance, setNewImportance] = useState("0.5");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ memory: Memory[] }>("/api/ai/memory");
      setMemory(data.memory || []);
    } catch (err: any) {
      toast({
        title: "Failed to load memory",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMemory = async () => {
    if (!newContent.trim()) {
      toast({ title: "Content required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/api/ai/memory", {
        method: "POST",
        body: JSON.stringify({
          content: newContent,
          kind: newKind,
          agentKey: newAgentKey || undefined,
          importance: Number(newImportance),
        }),
      });
      setAddDialogOpen(false);
      setNewContent("");
      setNewKind("fact");
      setNewAgentKey("");
      setNewImportance("0.5");
      refresh();
      toast({ title: "Memory added" });
    } catch (err: any) {
      toast({
        title: "Failed to add memory",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteMemory = async (id: string) => {
    if (!confirm("Delete this memory?")) return;
    try {
      await apiFetch(`/api/ai/memory?memoryId=${id}`, { method: "DELETE" });
      setMemory((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Memory deleted" });
    } catch (err: any) {
      toast({
        title: "Failed to delete",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const filtered = memory.filter((m) => {
    if (filterKind !== "all" && m.kind !== filterKind) return false;
    if (filterAgent !== "all" && m.agentKey !== filterAgent) return false;
    if (
      search &&
      !m.content.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const agentKeys = Array.from(
    new Set(memory.map((m) => m.agentKey).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
            <Brain className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Memory</h2>
            <p className="text-sm text-muted-foreground">
              What the AI agents remember about you and your work.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="brand-gradient text-white"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="size-4" />
            Add memory
          </Button>
        </div>
      </div>

      {/* Stats + filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total memories</p>
            <p className="text-xl font-bold">{memory.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Avg importance</p>
            <p className="text-xl font-bold">
              {memory.length
                ? (
                    memory.reduce((s, m) => s + m.importance, 0) /
                    memory.length
                  ).toFixed(2)
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Agents with memory</p>
            <p className="text-xl font-bold">{agentKeys.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Kinds</p>
            <p className="text-xl font-bold">
              {Array.from(new Set(memory.map((m) => m.kind))).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories…"
            className="pl-9"
          />
        </div>
        <Select value={filterKind} onValueChange={setFilterKind}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All kinds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            <SelectItem value="fact">Facts</SelectItem>
            <SelectItem value="preference">Preferences</SelectItem>
            <SelectItem value="project">Projects</SelectItem>
            <SelectItem value="context">Context</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAgent} onValueChange={setFilterAgent}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agentKeys.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Memory list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <Brain className="size-10 text-muted-foreground/40 mb-2" />
            <h3 className="text-base font-semibold">
              {memory.length === 0 ? "No memories yet" : "No matches"}
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {memory.length === 0
                ? "AI agents will remember things about your work as you chat. You can also add memories manually."
                : "Try adjusting your search or filters."}
            </p>
            {memory.length === 0 && (
              <Button
                size="sm"
                className="mt-4 brand-gradient text-white"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="size-4" />
                Add your first memory
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((m) => {
            const kindMeta = KIND_META[m.kind] || {
              icon: AlertTriangle,
              color: "text-muted-foreground bg-muted",
              label: m.kind,
            };
            const KindIcon = kindMeta.icon;
            return (
              <li
                key={m.id}
                className="group rounded-md border p-3 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={
                      "flex size-8 items-center justify-center rounded-md shrink-0 " +
                      kindMeta.color
                    }
                  >
                    <KindIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {kindMeta.label}
                      </Badge>
                      {m.agentKey && (
                        <Badge variant="secondary" className="capitalize">
                          {m.agentKey}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        importance {m.importance.toFixed(2)}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm">{m.content}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteMemory(m.id)}
                    aria-label="Delete memory"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add memory dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a memory</DialogTitle>
            <DialogDescription>
              Memories are surfaced to AI agents when relevant, helping them
              give better, more personalized responses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="e.g. I sell handmade wooden home decor on Etsy and prefer a minimalist aesthetic."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select value={newKind} onValueChange={setNewKind}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fact">Fact</SelectItem>
                    <SelectItem value="preference">Preference</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="context">Context</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Agent (optional)</Label>
                <Input
                  value={newAgentKey}
                  onChange={(e) => setNewAgentKey(e.target.value)}
                  placeholder="e.g. listing, seo"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                Importance ({Number(newImportance).toFixed(2)})
              </Label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={newImportance}
                onChange={(e) => setNewImportance(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher importance = more likely to be recalled.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={addMemory}
              disabled={creating || !newContent.trim()}
              className="brand-gradient text-white"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add memory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
