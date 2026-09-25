"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings, RefreshCw, Save, Loader2, Check, Pencil } from "lucide-react";

type Setting = {
  id: string;
  key: string;
  value: string;
  category: string;
  updatedAt: string;
};

export function AdminSettings() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ settings: Setting[] }>("/api/admin/settings");
      setSettings(data.settings || []);
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

  const save = async (key: string) => {
    setSaving(key);
    try {
      await apiFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ key, value: editing[key] }),
      });
      toast({ title: "Setting saved" });
      setEditing((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      load();
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

  const grouped = settings.reduce<Record<string, Setting[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Platform-wide key/value configuration.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <Card key={cat}>
              <CardContent className="p-0">
                <div className="border-b p-3">
                  <div className="flex items-center gap-2">
                    <Settings className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {cat}
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      {list.length}
                    </Badge>
                  </div>
                </div>
                <div className="max-h-[50vh] overflow-y-auto scroll-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((s) => {
                        const isEditing = editing[s.key] !== undefined;
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-mono text-xs">
                              {s.key}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={editing[s.key]}
                                  onChange={(e) =>
                                    setEditing((prev) => ({
                                      ...prev,
                                      [s.key]: e.target.value,
                                    }))
                                  }
                                  className="h-8 text-xs"
                                  autoFocus
                                />
                              ) : (
                                <span className="text-xs font-mono">
                                  {s.value.length > 80
                                    ? s.value.slice(0, 80) + "…"
                                    : s.value}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(s.updatedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {isEditing ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Save"
                                      onClick={() => save(s.key)}
                                      disabled={saving === s.key}
                                    >
                                      {saving === s.key ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <Check className="size-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Cancel"
                                      onClick={() =>
                                        setEditing((prev) => {
                                          const next = { ...prev };
                                          delete next[s.key];
                                          return next;
                                        })
                                      }
                                    >
                                      <Loader2 className="size-4 opacity-0" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Edit"
                                    onClick={() =>
                                      setEditing((prev) => ({
                                        ...prev,
                                        [s.key]: s.value,
                                      }))
                                    }
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
