"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FileText, Save, Loader2, Search, RefreshCw, Clock } from "lucide-react";

type PromptVersion = {
  id: string;
  version: number;
  content: string;
  notes: string | null;
  isCurrent: boolean;
  createdAt: string;
};

type Prompt = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  agentType: string | null;
  isActive: boolean;
  versions: PromptVersion[];
  _count: { versions: number };
};

export function AdminPrompts() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ prompts: Prompt[] }>("/api/admin/prompts");
      setPrompts(data.prompts || []);
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

  const openEditor = (p: Prompt) => {
    setEditing(p);
    const current = p.versions.find((v) => v.isCurrent) || p.versions[0];
    setDraft(current?.content || "");
    setNotes("");
  };

  const saveVersion = async () => {
    if (!editing || !draft.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/prompts", {
        method: "POST",
        body: JSON.stringify({
          key: editing.key,
          content: draft,
          notes: notes || undefined,
        }),
      });
      toast({ title: "Saved new prompt version" });
      setEditing(null);
      load();
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = prompts.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      return (
        p.key.toLowerCase().includes(s) ||
        p.name.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prompts</h2>
          <p className="text-sm text-muted-foreground">
            Versioned system prompts for all AI agents.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search prompts by key, name, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto scroll-thin pr-1">
          {filtered.map((p) => {
            const current = p.versions.find((v) => v.isCurrent) || p.versions[0];
            return (
              <Card key={p.id} className="hover:shadow-sm transition-shadow cursor-pointer" >
                <button
                  className="w-full text-left"
                  onClick={() => openEditor(p)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="size-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{p.name}</p>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {p.key}
                        </Badge>
                        {p.agentType && (
                          <Badge variant="secondary" className="text-[10px]">
                            {p.agentType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {current?.content.slice(0, 120) || "No content"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px]">
                        v{current?.version}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {p._count.versions} versions
                      </p>
                    </div>
                  </CardContent>
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor sheet */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              {editing?.name}
            </SheetTitle>
            <SheetDescription className="font-mono">{editing?.key}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-4">
            {/* History */}
            {editing && editing.versions.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Version history
                </p>
                <ul className="space-y-1 max-h-32 overflow-y-auto scroll-thin">
                  {editing.versions.slice(0, 5).map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between rounded-md border p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={v.isCurrent ? "default" : "outline"} className="text-[10px]">
                          v{v.version}
                        </Badge>
                        <span className="text-muted-foreground">
                          {v.notes || "—"}
                        </span>
                      </div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            <div className="space-y-1.5">
              <Label>Content (Markdown / template syntax)</Label>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={16}
                className="font-mono text-xs"
                placeholder="You are the {{agentName}}…"
              />
              <p className="text-xs text-muted-foreground">
                Use <code>{"{{variable}}"}</code> syntax for template variables.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What changed?"
              />
            </div>
          </div>

          <div className="border-t p-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={saveVersion}
              disabled={saving || !draft.trim()}
              className="brand-gradient text-white"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save new version
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
