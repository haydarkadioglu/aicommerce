"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Loader2, Cpu, RefreshCw, Star } from "lucide-react";

type Provider = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  baseUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  capabilities: string;
  config: string | null;
  models: Model[];
};

type Model = {
  id: string;
  modelId: string;
  displayName: string;
  contextWindow: number;
  isActive: boolean;
  isDefault: boolean;
  capabilities: string;
};

export function AdminProviders() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Provider | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ providers: Provider[] }>("/api/admin/providers");
      setProviders(data.providers || []);
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

  const saveProvider = async (data: {
    key: string;
    name: string;
    baseUrl?: string;
    isActive: boolean;
    isDefault: boolean;
    apiKey?: string;
  }) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/providers", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast({ title: "Provider saved" });
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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Providers</h2>
          <p className="text-sm text-muted-foreground">
            Configure external AI providers and their models.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setEditing("new")} className="brand-gradient text-white">
            <Plus className="size-4" />
            Add provider
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "flex size-9 items-center justify-center rounded-lg " +
                        (p.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
                      }
                    >
                      <Cpu className="size-4" />
                    </span>
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{p.key}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.isDefault && (
                      <Badge className="brand-gradient text-white text-[10px] gap-1">
                        <Star className="size-3" /> Default
                      </Badge>
                    )}
                    <Badge variant={p.isActive ? "default" : "secondary"} className="text-[10px]">
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {p.description && (
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                )}
                {p.baseUrl && (
                  <div>
                    <p className="text-xs text-muted-foreground">Base URL</p>
                    <p className="text-xs font-mono truncate">{p.baseUrl}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Capabilities</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.capabilities.split(",").map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">
                        {c.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
                {p.models.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Models ({p.models.length})
                    </p>
                    <ul className="space-y-1 max-h-32 overflow-y-auto scroll-thin">
                      {p.models.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs"
                        >
                          <span className="font-mono">{m.modelId}</span>
                          <div className="flex gap-1">
                            {m.isDefault && (
                              <Badge variant="secondary" className="text-[9px]">default</Badge>
                            )}
                            {!m.isActive && (
                              <Badge variant="outline" className="text-[9px]">off</Badge>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-auto"
                  onClick={() => setEditing(p)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <EditProviderDialog
          provider={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={saveProvider}
          saving={saving}
        />
      )}
    </div>
  );
}

function EditProviderDialog({
  provider,
  onClose,
  onSave,
  saving,
}: {
  provider: Provider | null;
  onClose: () => void;
  onSave: (d: {
    key: string;
    name: string;
    baseUrl?: string;
    isActive: boolean;
    isDefault: boolean;
    apiKey?: string;
  }) => void;
  saving: boolean;
}) {
  const [key, setKey] = useState(provider?.key || "");
  const [name, setName] = useState(provider?.name || "");
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl || "");
  const [isActive, setIsActive] = useState(provider?.isActive ?? true);
  const [isDefault, setIsDefault] = useState(provider?.isDefault ?? false);
  const [apiKey, setApiKey] = useState("");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{provider ? "Edit provider" : "Add provider"}</DialogTitle>
          <DialogDescription>
            Configure API key, base URL, and default settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase())}
                placeholder="openai"
                disabled={!!provider}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="OpenAI" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="space-y-1.5">
            <Label>API key (optional)</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-…"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to keep existing key.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Make this provider available</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Default</p>
              <p className="text-xs text-muted-foreground">Use as default for AI calls</p>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() =>
              onSave({
                key,
                name,
                baseUrl: baseUrl || undefined,
                isActive,
                isDefault,
                apiKey: apiKey || undefined,
              })
            }
            disabled={saving || !key || !name}
            className="brand-gradient text-white"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
