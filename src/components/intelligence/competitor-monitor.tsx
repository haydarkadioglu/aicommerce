"use client";

import { useState, useCallback, useEffect } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { relativeTime } from "@/lib/relative-time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Users,
  Plus,
  Loader2,
  Scan,
  Trash2,
  ExternalLink,
  Store,
  Package,
  Tag,
  Search,
  Image,
  FolderTree,
  AlertTriangle,
  Info,
  AlertCircle,
  ArrowRight,
  Clock,
} from "lucide-react";

type CompetitorChange = {
  id: string;
  changeType: string; // new-product | price-change | seo-update | listing-update | visual-update | new-category
  severity: string; // info | warning | important
  title: string;
  description?: string | null;
  productUrl?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  detectedAt: string;
};

type CompetitorShop = {
  id: string;
  shopName: string;
  shopUrl: string;
  marketplace: string;
  status?: string;
  lastScannedAt?: string | null;
  changes?: CompetitorChange[];
  createdAt: string;
};

const MARKETPLACES = [
  { value: "etsy", label: "Etsy" },
  { value: "amazon", label: "Amazon" },
  { value: "alibaba", label: "Alibaba" },
  { value: "1688", label: "1688" },
  { value: "shopify", label: "Shopify" },
  { value: "other", label: "Other" },
];

const MARKETPLACE_BADGE: Record<string, string> = {
  etsy: "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/30",
  amazon: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30",
  alibaba: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  "1688": "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30",
  shopify: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30",
  other: "bg-muted text-muted-foreground",
};

const CHANGE_META: Record<
  string,
  { icon: any; color: string; label: string }
> = {
  "new-product": { icon: Package, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30", label: "New Product" },
  "price-change": { icon: Tag, color: "text-amber-500 bg-amber-500/10 border-amber-500/30", label: "Price Change" },
  "seo-update": { icon: Search, color: "text-violet-500 bg-violet-500/10 border-violet-500/30", label: "SEO Update" },
  "listing-update": { icon: Store, color: "text-violet-500 bg-violet-500/10 border-violet-500/30", label: "Listing Update" },
  "visual-update": { icon: Image, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30", label: "Visual Update" },
  "new-category": { icon: FolderTree, color: "text-amber-500 bg-amber-500/10 border-amber-500/30", label: "New Category" },
};

const SEVERITY_META: Record<
  string,
  { icon: any; color: string; label: string }
> = {
  info: { icon: Info, color: "text-muted-foreground bg-muted", label: "Info" },
  warning: { icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10 border-amber-500/30", label: "Warning" },
  important: { icon: AlertCircle, color: "text-rose-500 bg-rose-500/10 border-rose-500/30", label: "Important" },
};

export function CompetitorMonitor() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [shops, setShops] = useState<CompetitorShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    shopName: "",
    shopUrl: "",
    marketplace: "etsy",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ shops: CompetitorShop[] }>(
        "/api/competitors/monitor"
      );
      setShops(data.shops || []);
    } catch (err: any) {
      toast({
        title: "Failed to load shops",
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

  const addShop = async () => {
    if (!form.shopName.trim() || !form.shopUrl.trim()) {
      toast({ title: "Shop name and URL required", variant: "destructive" });
      return;
    }
    let url = form.shopUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    setCreating(true);
    try {
      const data = await apiFetch<{ shop: CompetitorShop }>(
        "/api/competitors/monitor?action=add",
        {
          method: "POST",
          body: JSON.stringify({
            shopName: form.shopName.trim(),
            shopUrl: url,
            marketplace: form.marketplace,
          }),
        }
      );
      setShops((prev) => [data.shop, ...prev]);
      setDialogOpen(false);
      setForm({ shopName: "", shopUrl: "", marketplace: "etsy" });
      toast({ title: "Shop added", description: data.shop.shopName });
    } catch (err: any) {
      toast({
        title: "Add failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const scanShop = async (shop: CompetitorShop) => {
    setScanningId(shop.id);
    try {
      const data = await apiFetch<{
        changes: CompetitorChange[];
        meta: { model: string; latencyMs: number };
      }>(`/api/competitors/monitor?action=scan`, {
        method: "POST",
        body: JSON.stringify({ shopId: shop.id }),
      });
      setShops((prev) =>
        prev.map((s) =>
          s.id === shop.id
            ? {
                ...s,
                lastScannedAt: new Date().toISOString(),
                changes: (data.changes || []).map((c, i) => ({
                  ...c,
                  // API returns dbId instead of id — keep stable
                  id: (c as any).dbId || `${shop.id}-${i}-${Date.now()}`,
                  detectedAt: new Date().toISOString(),
                })),
              }
            : s
        )
      );
      toast({
        title: `Scan complete for ${shop.shopName}`,
        description: `${data.changes?.length || 0} changes detected`,
      });
    } catch (err: any) {
      toast({
        title: "Scan failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setScanningId(null);
    }
  };

  const deleteShop = async (shop: CompetitorShop) => {
    try {
      await apiFetch(`/api/competitors/monitor?shopId=${shop.id}`, {
        method: "DELETE",
      });
      setShops((prev) => prev.filter((s) => s.id !== shop.id));
      toast({ title: "Shop removed", description: shop.shopName });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const [scanningId, setScanningId] = useState<string | null>(null);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
            <Users className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Competitor Monitor</h2>
            <p className="text-sm text-muted-foreground">
              Save competitor shops, scan for changes, and AI-summarize detected moves.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient text-white">
              <Plus className="size-4" />
              Add Shop
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Competitor Shop</DialogTitle>
              <DialogDescription>
                Track a competitor shop. We scan it on demand and persist detected changes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="shop-name">Shop Name</Label>
                <Input
                  id="shop-name"
                  value={form.shopName}
                  onChange={(e) => setForm((f) => ({ ...f, shopName: e.target.value }))}
                  placeholder="e.g. Walnut Workshop"
                  disabled={creating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shop-url">Shop URL</Label>
                <Input
                  id="shop-url"
                  value={form.shopUrl}
                  onChange={(e) => setForm((f) => ({ ...f, shopUrl: e.target.value }))}
                  placeholder="https://www.etsy.com/shop/your-competitor"
                  disabled={creating}
                />
              </div>
              <div className="grid gap-2">
                <Label>Marketplace</Label>
                <Select
                  value={form.marketplace}
                  onValueChange={(v) => setForm((f) => ({ ...f, marketplace: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETPLACES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                onClick={addShop}
                disabled={creating || !form.shopName.trim() || !form.shopUrl.trim()}
                className="brand-gradient text-white"
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Add Shop
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
      ) : shops.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Users className="size-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">No shops monitored yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Click “Add Shop” to track a competitor. Then click Scan on the card to AI-detect
              new products, price changes, SEO updates, and more.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 max-h-[800px] overflow-y-auto scroll-thin pr-1">
          {shops.map((shop) => (
            <CompetitorShopCard
              key={shop.id}
              shop={shop}
              scanning={scanningId === shop.id}
              onScan={() => scanShop(shop)}
              onDelete={() => deleteShop(shop)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helper components
// ============================================================

function CompetitorShopCard({
  shop,
  scanning,
  onScan,
  onDelete,
}: {
  shop: CompetitorShop;
  scanning: boolean;
  onScan: () => void;
  onDelete: () => void;
}) {
  const mpBadge = MARKETPLACE_BADGE[shop.marketplace] || MARKETPLACE_BADGE.other;
  const changes = shop.changes || [];

  return (
    <Card>
      <CardContent className="p-4 md:p-5 space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
              <Store className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{shop.shopName}</h3>
                <Badge variant="outline" className={"text-[10px] capitalize " + mpBadge}>
                  {shop.marketplace}
                </Badge>
              </div>
              <a
                href={shop.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-1"
              >
                {shop.shopUrl}
                <ExternalLink className="size-3" />
              </a>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                {shop.lastScannedAt ? (
                  <span>Last scanned: <span className="font-medium text-foreground">{relativeTime(shop.lastScannedAt)}</span></span>
                ) : (
                  <span>Never scanned</span>
                )}
                {changes.length > 0 && (
                  <span>Detected: <span className="font-medium text-foreground">{changes.length} changes</span></span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onScan} disabled={scanning}>
              {scanning ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Scan className="size-3.5" />
              )}
              Scan
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete shop">
              <Trash2 className="size-3.5 text-rose-500" />
            </Button>
          </div>
        </div>

        {/* Changes */}
        {scanning ? (
          <div className="space-y-2">
            <Separator />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-violet-500" />
              AI scanning for changes…
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : changes.length > 0 ? (
          <>
            <Separator />
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <Clock className="size-3.5" />
                Detected Changes
              </p>
              <ul className="space-y-2 max-h-96 overflow-y-auto scroll-thin pr-1">
                {changes.map((change) => (
                  <ChangeItem key={change.id} change={change} />
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ChangeItem({ change }: { change: CompetitorChange }) {
  const cm = CHANGE_META[change.changeType] || {
    icon: AlertCircle,
    color: "text-muted-foreground bg-muted",
    label: change.changeType,
  };
  const sm = SEVERITY_META[change.severity] || SEVERITY_META.info;
  const CIcon = cm.icon;
  const SIcon = sm.icon;

  const hasValues = change.oldValue || change.newValue;

  return (
    <li className="rounded-md border bg-muted/20 p-3">
      <div className="flex items-start gap-3">
        <span className={"flex size-8 items-center justify-center rounded shrink-0 " + cm.color}>
          <CIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-medium">{change.title}</h4>
            <Badge variant="outline" className={"text-[10px] " + cm.color}>
              {cm.label}
            </Badge>
            <Badge variant="outline" className={"text-[10px] " + sm.color}>
              <SIcon className="size-3" />
              {sm.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {relativeTime(change.detectedAt)}
            </span>
          </div>
          {change.description && (
            <p className="text-xs text-muted-foreground mt-1">{change.description}</p>
          )}
          {hasValues && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              {change.oldValue && (
                <span className="rounded bg-rose-500/5 border border-rose-500/20 px-1.5 py-0.5 text-rose-600 dark:text-rose-300 line-through">
                  {change.oldValue}
                </span>
              )}
              {change.oldValue && change.newValue && (
                <ArrowRight className="size-3 text-muted-foreground" />
              )}
              {change.newValue && (
                <span className="rounded bg-emerald-500/5 border border-emerald-500/20 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-300 font-medium">
                  {change.newValue}
                </span>
              )}
            </div>
          )}
          {change.productUrl && (
            <a
              href={change.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-violet-500 hover:underline mt-2"
            >
              View product <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
