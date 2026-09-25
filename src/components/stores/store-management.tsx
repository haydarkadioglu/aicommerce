"use client";

import { useEffect, useState, useCallback } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/app-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Store as StoreIcon,
  Plus,
  Loader2,
  MoreVertical,
  Edit3,
  Trash2,
  Check,
  Globe,
  DollarSign,
  Languages,
  Clock,
} from "lucide-react";

type Store = {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  marketplace: string;
  storeUrl: string | null;
  country: string;
  currency: string;
  language: string;
  timezone: string;
  status: string;
  notes: string | null;
  brandName: string | null;
  brandVoice: string | null;
  niche: string | null;
  targetCustomer: string | null;
  avgSellingPrice: number | null;
  preferredProfitMargin: number | null;
  preferredShippingStrategy: string | null;
  brandWritingStyle: string | null;
  brandVisualStyle: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    projects: number;
    discoveredProducts: number;
    listings: number;
    aiMemories: number;
    automationRules: number;
  };
};

const MARKETPLACES = [
  { value: "etsy", label: "Etsy" },
  { value: "shopify", label: "Shopify" },
  { value: "woocommerce", label: "WooCommerce" },
  { value: "amazon", label: "Amazon" },
  { value: "ebay", label: "eBay" },
  { value: "tiktok-shop", label: "TikTok Shop" },
  { value: "facebook", label: "Facebook Marketplace" },
  { value: "custom", label: "Custom Store" },
];

export function StoreManagement() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const setActiveStoreId = useAppStore((s) => s.setActiveStoreId);
  const setView = useAppStore((s) => s.setView);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // New store dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStore, setNewStore] = useState({
    name: "",
    description: "",
    marketplace: "etsy",
    storeUrl: "",
    country: "US",
    currency: "USD",
    language: "en",
    timezone: "America/New_York",
    brandName: "",
    brandVoice: "",
    notes: "",
  });

  // Edit store dialog
  const [editTarget, setEditTarget] = useState<Store | null>(null);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ stores: Store[] }>("/api/stores");
      setStores(data.stores || []);
      if (data.stores?.length > 0 && !activeStoreId) {
        setActiveStoreId(data.stores[0].id);
      }
    } catch (err: any) {
      toast({
        title: "Failed to load stores",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, toast, activeStoreId, setActiveStoreId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createStore = async () => {
    if (!newStore.name.trim()) {
      toast({ title: "Store name required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const data = await apiFetch<{ store: Store }>("/api/stores", {
        method: "POST",
        body: JSON.stringify(newStore),
      });
      setStores((prev) => [...prev, data.store]);
      setActiveStoreId(data.store.id);
      setCreateOpen(false);
      setNewStore({
        name: "",
        description: "",
        marketplace: "etsy",
        storeUrl: "",
        country: "US",
        currency: "USD",
        language: "en",
        timezone: "America/New_York",
        brandName: "",
        brandVoice: "",
        notes: "",
      });
      toast({ title: "Store created!" });
    } catch (err: any) {
      toast({
        title: "Failed to create store",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteStore = async (id: string) => {
    if (!confirm("Delete this store and all its data?")) return;
    try {
      await apiFetch(`/api/stores/${id}`, { method: "DELETE" });
      setStores((prev) => prev.filter((s) => s.id !== id));
      if (activeStoreId === id) {
        setActiveStoreId(null);
      }
      toast({ title: "Store deleted" });
    } catch (err: any) {
      toast({
        title: "Failed to delete",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const saveEdit = async () => {
    if (!editStore) return;
    setSaving(true);
    try {
      await apiFetch(`/api/stores/${editStore.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editStore.name,
          description: editStore.description,
          storeUrl: editStore.storeUrl,
          country: editStore.country,
          currency: editStore.currency,
          language: editStore.language,
          timezone: editStore.timezone,
          brandName: editStore.brandName,
          brandVoice: editStore.brandVoice,
          notes: editStore.notes,
          status: editStore.status,
          niche: editStore.niche,
          targetCustomer: editStore.targetCustomer,
          avgSellingPrice: editStore.avgSellingPrice,
          preferredProfitMargin: editStore.preferredProfitMargin,
          preferredShippingStrategy: editStore.preferredShippingStrategy,
          brandWritingStyle: editStore.brandWritingStyle,
          brandVisualStyle: editStore.brandVisualStyle,
        }),
      });
      setStores((prev) =>
        prev.map((s) => (s.id === editStore.id ? { ...s, ...editStore } : s))
      );
      setEditTarget(null);
      setEditStore(null);
      toast({ title: "Store updated" });
    } catch (err: any) {
      toast({
        title: "Failed to update",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
            <StoreIcon className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Stores</h2>
            <p className="text-sm text-muted-foreground">
              Manage your stores across multiple marketplaces.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="brand-gradient text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          New store
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <StoreIcon className="size-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">No stores yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Create your first store to start managing products, listings,
              and AI intelligence across marketplaces.
            </p>
            <Button
              size="sm"
              className="mt-4 brand-gradient text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              Create your first store
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card
              key={store.id}
              className={
                "group relative cursor-pointer transition-all hover:shadow-md " +
                (store.id === activeStoreId
                  ? "border-primary ring-1 ring-primary/30"
                  : "hover:border-primary/30")
              }
              onClick={() => {
                setActiveStoreId(store.id);
                setView("dashboard");
                toast({ title: `Switched to ${store.name}` });
              }}
            >
              {store.id === activeStoreId && (
                <div className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full brand-gradient text-white">
                  <Check className="size-3" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white shrink-0">
                      <StoreIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{store.name}</h3>
                      <Badge variant="outline" className="capitalize text-xs">
                        {store.marketplace}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditTarget(store);
                          setEditStore({ ...store });
                        }}
                      >
                        <Edit3 className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStore(store.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {store.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {store.description}
                  </p>
                )}
                <Separator className="my-3" />
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Globe className="size-3" />
                    {store.country}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="size-3" />
                    {store.currency}
                  </div>
                  <div className="flex items-center gap-1">
                    <Languages className="size-3" />
                    {store.language}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {store.timezone.split("/").pop()}
                  </div>
                </div>
                {store._count && (
                  <div className="mt-3 flex gap-2 text-xs">
                    <Badge variant="secondary">
                      {store._count.projects} projects
                    </Badge>
                    <Badge variant="secondary">
                      {store._count.listings} listings
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create store dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a new store</DialogTitle>
            <DialogDescription>
              Each store has its own products, listings, AI memory, and automation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto scroll-thin pr-1">
            <div className="space-y-1.5">
              <Label>Store name *</Label>
              <Input
                value={newStore.name}
                onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                placeholder="e.g. Walnut Workshop"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={newStore.description}
                onChange={(e) => setNewStore({ ...newStore, description: e.target.value })}
                placeholder="Brief description of your store"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Marketplace</Label>
                <Select
                  value={newStore.marketplace}
                  onValueChange={(v) => setNewStore({ ...newStore, marketplace: v })}
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
              <div className="space-y-1.5">
                <Label>Store URL</Label>
                <Input
                  value={newStore.storeUrl}
                  onChange={(e) => setNewStore({ ...newStore, storeUrl: e.target.value })}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input
                  value={newStore.country}
                  onChange={(e) => setNewStore({ ...newStore, country: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input
                  value={newStore.currency}
                  onChange={(e) => setNewStore({ ...newStore, currency: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Input
                  value={newStore.language}
                  onChange={(e) => setNewStore({ ...newStore, language: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Input
                  value={newStore.timezone}
                  onChange={(e) => setNewStore({ ...newStore, timezone: e.target.value })}
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>Brand name</Label>
              <Input
                value={newStore.brandName}
                onChange={(e) => setNewStore({ ...newStore, brandName: e.target.value })}
                placeholder="e.g. Artisan Goods Co."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Brand voice</Label>
              <Input
                value={newStore.brandVoice}
                onChange={(e) => setNewStore({ ...newStore, brandVoice: e.target.value })}
                placeholder="e.g. warm, artisanal, premium"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={newStore.notes}
                onChange={(e) => setNewStore({ ...newStore, notes: e.target.value })}
                placeholder="Internal notes about this store"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createStore}
              disabled={creating || !newStore.name.trim()}
              className="brand-gradient text-white"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit store dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit store</DialogTitle>
            <DialogDescription>
              Update store settings, brand info, and preferences.
            </DialogDescription>
          </DialogHeader>
          {editStore && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto scroll-thin pr-1">
              <div className="space-y-1.5">
                <Label>Store name</Label>
                <Input
                  value={editStore.name}
                  onChange={(e) => setEditStore({ ...editStore, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={editStore.description || ""}
                  onChange={(e) => setEditStore({ ...editStore, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Store URL</Label>
                  <Input
                    value={editStore.storeUrl || ""}
                    onChange={(e) => setEditStore({ ...editStore, storeUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={editStore.status}
                    onValueChange={(v) => setEditStore({ ...editStore, status: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input
                    value={editStore.country}
                    onChange={(e) => setEditStore({ ...editStore, country: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input
                    value={editStore.currency}
                    onChange={(e) => setEditStore({ ...editStore, currency: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label>Brand name</Label>
                <Input
                  value={editStore.brandName || ""}
                  onChange={(e) => setEditStore({ ...editStore, brandName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Brand voice</Label>
                <Input
                  value={editStore.brandVoice || ""}
                  onChange={(e) => setEditStore({ ...editStore, brandVoice: e.target.value })}
                />
              </div>
              <Separator />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Store Intelligence</p>
              <div className="space-y-1.5">
                <Label>Niche</Label>
                <Input
                  value={editStore.niche || ""}
                  onChange={(e) => setEditStore({ ...editStore, niche: e.target.value })}
                  placeholder="e.g. handcrafted walnut home decor"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target customer</Label>
                <Input
                  value={editStore.targetCustomer || ""}
                  onChange={(e) => setEditStore({ ...editStore, targetCustomer: e.target.value })}
                  placeholder="e.g. homeowners aged 30-55, premium taste"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Avg selling price</Label>
                  <Input
                    type="number"
                    value={editStore.avgSellingPrice || ""}
                    onChange={(e) => setEditStore({ ...editStore, avgSellingPrice: Number(e.target.value) })}
                    placeholder="25.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Target margin (%)</Label>
                  <Input
                    type="number"
                    value={editStore.preferredProfitMargin || ""}
                    onChange={(e) => setEditStore({ ...editStore, preferredProfitMargin: Number(e.target.value) })}
                    placeholder="40"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Shipping strategy</Label>
                <Input
                  value={editStore.preferredShippingStrategy || ""}
                  onChange={(e) => setEditStore({ ...editStore, preferredShippingStrategy: e.target.value })}
                  placeholder="e.g. free shipping over $50"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Brand writing style</Label>
                <Input
                  value={editStore.brandWritingStyle || ""}
                  onChange={(e) => setEditStore({ ...editStore, brandWritingStyle: e.target.value })}
                  placeholder="e.g. warm, artisanal, premium"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Brand visual style</Label>
                <Input
                  value={editStore.brandVisualStyle || ""}
                  onChange={(e) => setEditStore({ ...editStore, brandVisualStyle: e.target.value })}
                  placeholder="e.g. minimalist, natural light, neutral tones"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={editStore.notes || ""}
                  onChange={(e) => setEditStore({ ...editStore, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={saving || !editStore?.name?.trim()}
              className="brand-gradient text-white"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Edit3 className="size-4" />
              )}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
