"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { CreditCard, RefreshCw, Pencil, Loader2, Star } from "lucide-react";

type Plan = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  limits: string | null;
  _count?: { subscriptions: number };
};

export function AdminPlans() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ plans: Plan[] }>("/api/admin/plans");
      setPlans(data.plans || []);
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

  const save = async (data: {
    name?: string;
    description?: string;
    priceMonthly?: number;
    priceYearly?: number;
    isActive?: boolean;
    limits?: any;
  }) => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/plans?planId=${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      toast({ title: "Plan saved" });
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
          <h2 className="text-2xl font-bold tracking-tight">Subscription Plans</h2>
          <p className="text-sm text-muted-foreground">
            Manage pricing and limits for each tier.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            let limits: any = null;
            try {
              limits = p.limits ? JSON.parse(p.limits) : null;
            } catch {
              // ignore
            }
            return (
              <Card key={p.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{p.key}</p>
                    </div>
                    {p.isDefault && (
                      <Badge className="brand-gradient text-white text-[10px] gap-1">
                        <Star className="size-3" />
                        Default
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {p.description && (
                    <CardDescription>{p.description}</CardDescription>
                  )}
                  <div>
                    <p className="text-2xl font-bold">
                      ${p.priceMonthly}
                      <span className="text-xs font-normal text-muted-foreground">/mo</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${p.priceYearly} yearly
                    </p>
                  </div>
                  {limits && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Limits
                      </p>
                      <ul className="text-xs space-y-0.5">
                        {Object.entries(limits).map(([k, v]) => (
                          <li key={k} className="flex justify-between">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-mono">
                              {typeof v === "number" && v < 0 ? "unlimited" : String(v)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant={p.isActive ? "default" : "secondary"} className="text-[10px]">
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {p._count?.subscriptions !== undefined && (
                      <span className="text-muted-foreground">
                        {p._count.subscriptions} subs
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setEditing(p)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <EditPlanDialog
          plan={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          saving={saving}
        />
      )}
    </div>
  );
}

function EditPlanDialog({
  plan,
  onClose,
  onSave,
  saving,
}: {
  plan: Plan;
  onClose: () => void;
  onSave: (d: any) => void;
  saving: boolean;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description || "");
  const [priceMonthly, setPriceMonthly] = useState(plan.priceMonthly);
  const [priceYearly, setPriceYearly] = useState(plan.priceYearly);
  const [isActive, setIsActive] = useState(plan.isActive);
  let initialLimits: any = {};
  try {
    initialLimits = plan.limits ? JSON.parse(plan.limits) : {};
  } catch {
    // ignore
  }
  const [limitsText, setLimitsText] = useState(JSON.stringify(initialLimits, null, 2));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit plan</DialogTitle>
          <DialogDescription>{plan.key}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monthly ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Yearly ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={priceYearly}
                onChange={(e) => setPriceYearly(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Limits (JSON)</Label>
            <Textarea
              value={limitsText}
              onChange={(e) => setLimitsText(e.target.value)}
              rows={4}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Available for purchase</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              let limits: any;
              try {
                limits = JSON.parse(limitsText);
              } catch {
                toast({
                  title: "Invalid JSON",
                  description: "Please fix the limits JSON before saving.",
                  variant: "destructive",
                });
                return;
              }
              onSave({
                name,
                description,
                priceMonthly,
                priceYearly,
                isActive,
                limits,
              });
            }}
            disabled={saving}
            className="brand-gradient text-white"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
            Save plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
