"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Flag, RefreshCw, Loader2 } from "lucide-react";

type Flag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout: number;
};

export function AdminFlags() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ flags: Flag[] }>("/api/admin/flags");
      setFlags(data.flags || []);
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

  const update = async (flag: Flag, patch: Partial<Flag>) => {
    setSaving(flag.id);
    try {
      await apiFetch(`/api/admin/flags?flagId=${flag.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, ...patch } : f))
      );
      toast({ title: "Flag updated" });
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

  const filtered = flags.filter((f) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return f.key.toLowerCase().includes(s) || f.name.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Feature Flags</h2>
          <p className="text-sm text-muted-foreground">
            Toggle features and control rollout.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <Input
        placeholder="Search flags…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No flags found.
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flag</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Rollout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Flag className="size-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{f.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{f.key}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={f.enabled}
                            onCheckedChange={(v) => update(f, { enabled: v })}
                            disabled={saving === f.id}
                          />
                          <Badge variant={f.enabled ? "default" : "secondary"} className="text-[10px]">
                            {f.enabled ? "on" : "off"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-32">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={Math.round(f.rollout * 100)}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              setFlags((prev) =>
                                prev.map((p) =>
                                  p.id === f.id ? { ...p, rollout: n / 100 } : p
                                )
                              );
                            }}
                            onBlur={(e) =>
                              update(f, { rollout: Number(e.target.value) / 100 })
                            }
                            className="w-20 h-8"
                            disabled={saving === f.id}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          {saving === f.id && (
                            <Loader2 className="size-3 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
