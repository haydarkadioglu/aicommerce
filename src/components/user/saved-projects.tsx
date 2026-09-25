"use client";

import { useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderKanban,
  Plus,
  Sparkles,
  MoreVertical,
  Trash2,
  Edit3,
  Archive,
  RotateCcw,
  Folder,
  Package,
  Loader2,
  Search,
  ExternalLink,
  Copy,
  Download,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";

type Project = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  marketplace: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
};

type Product = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price: number | null;
  status: string;
  metadata: string | null;
  createdAt: string;
};

const TYPE_META: Record<
  string,
  { label: string; color: string }
> = {
  general: { label: "General", color: "bg-slate-500" },
  listing: { label: "Listing", color: "bg-violet-500" },
  research: { label: "Research", color: "bg-emerald-500" },
  campaign: { label: "Campaign", color: "bg-amber-500" },
};

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  archived: { label: "Archived", variant: "outline" },
};

export function SavedProjects() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const setView = useAppStore((s) => s.setView);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New project dialog
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState("general");
  const [newMarketplace, setNewMarketplace] = useState("etsy");
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  const [savingEdit, setSavingEdit] = useState(false);

  // Detail dialog
  const [detailTarget, setDetailTarget] = useState<Project | null>(null);
  const [detailProducts, setDetailProducts] = useState<Product[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!detailTarget) return;
    if (!importText.trim()) {
      toast({ title: "Paste CSV or JSON first", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      // Detect format
      const trimmed = importText.trim();
      const isJson =
        trimmed.startsWith("{") || trimmed.startsWith("[");
      const contentType = isJson
        ? "application/json"
        : "text/plain";
      const body = isJson
        ? (() => {
            try {
              // Wrap raw arrays in { products: [...] }
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                return JSON.stringify({ products: parsed });
              }
              return JSON.stringify(parsed);
            } catch {
              return trimmed; // let server validate
            }
          })()
        : trimmed;
      const data = await apiFetch<{
        imported: number;
        skipped: number;
        validationErrors?: string[];
      }>(`/api/projects/${detailTarget.id}/import`, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body,
      });
      toast({
        title: `Imported ${data.imported} product${data.imported === 1 ? "" : "s"}`,
        description: data.skipped
          ? `${data.skipped} row${data.skipped === 1 ? "" : "s"} skipped`
          : undefined,
      });
      setImportText("");
      setImportOpen(false);
      // Refresh the detail products list + project card count
      const detailData = await apiFetch<{ products: Product[] }>(
        `/api/projects/${detailTarget.id}/products`
      );
      setDetailProducts(detailData.products || []);
      refresh();
    } catch (err: any) {
      toast({
        title: "Import failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ projects: Project[] }>("/api/projects");
      setProjects(data.projects || []);
    } catch (err: any) {
      toast({
        title: "Failed to load projects",
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

  const createProject = async () => {
    if (!newName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const data = await apiFetch<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          description: newDescription || undefined,
          type: newType,
          marketplace: newMarketplace,
        }),
      });
      setProjects((prev) => [data.project, ...prev]);
      setNewDialogOpen(false);
      setNewName("");
      setNewDescription("");
      setNewType("general");
      toast({ title: "Project created" });
    } catch (err: any) {
      toast({
        title: "Failed to create project",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      await apiFetch(`/api/projects/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          status: editStatus,
        }),
      });
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editTarget.id
            ? {
                ...p,
                name: editName,
                description: editDescription,
                status: editStatus,
              }
            : p
        )
      );
      setEditTarget(null);
      toast({ title: "Project updated" });
    } catch (err: any) {
      toast({
        title: "Failed to update",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project and all its products?")) return;
    try {
      await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (detailTarget?.id === id) setDetailTarget(null);
      toast({ title: "Project deleted" });
    } catch (err: any) {
      toast({
        title: "Failed to delete",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const duplicateProject = async (project: Project) => {
    try {
      const data = await apiFetch<{ project: Project }>(
        `/api/projects/${project.id}/duplicate`,
        { method: "POST" }
      );
      setProjects((prev) => [data.project, ...prev]);
      toast({
        title: "Project duplicated",
        description: `"${data.project.name}" created as draft.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to duplicate",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const deleteProduct = async (projectId: string, productId: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await apiFetch(`/api/projects/${projectId}/products/${productId}`, {
        method: "DELETE",
      });
      setDetailProducts((prev) => prev.filter((p) => p.id !== productId));
      // Also update the project's product count
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                _count: {
                  products: Math.max(0, (p._count?.products ?? 0) - 1),
                },
              }
            : p
        )
      );
      toast({ title: "Product deleted" });
    } catch (err: any) {
      toast({
        title: "Failed to delete product",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const setStatus = async (project: Project, status: string) => {
    try {
      await apiFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status } : p))
      );
      toast({ title: `Marked as ${status}` });
    } catch (err: any) {
      toast({
        title: "Failed to update status",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const openDetail = async (project: Project) => {
    setDetailTarget(project);
    setDetailProducts([]);
    setDetailLoading(true);
    try {
      const data = await apiFetch<{ products: Product[] }>(
        `/api/projects/${project.id}/products`
      );
      setDetailProducts(data.products || []);
    } catch (err: any) {
      toast({
        title: "Failed to load products",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !p.description?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
            <FolderKanban className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Saved Projects</h2>
            <p className="text-sm text-muted-foreground">
              Your commerce projects, listings, and research in one place.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="brand-gradient text-white"
          onClick={() => setNewDialogOpen(true)}
        >
          <Plus className="size-4" />
          New project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <FolderKanban className="size-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">
              {projects.length === 0 ? "No projects yet" : "No matches"}
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {projects.length === 0
                ? "Saved projects will appear here. Start by creating one or generating a listing, then save the result as a project."
                : "Try adjusting your search or filter."}
            </p>
            {projects.length === 0 && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewDialogOpen(true)}
                >
                  <Plus className="size-4" />
                  New project
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView("product-research")}
                >
                  <Sparkles className="size-4" />
                  Start research
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView("listing-generator")}
                >
                  Generate listing
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const typeMeta = TYPE_META[project.type] || TYPE_META.general;
            const statusMeta =
              STATUS_META[project.status] || STATUS_META.draft;
            return (
              <Card
                key={project.id}
                className="group relative hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openDetail(project)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`flex size-8 items-center justify-center rounded-md ${typeMeta.color} text-white shrink-0`}
                      >
                        {project.type === "listing" ? (
                          <Package className="size-4" />
                        ) : (
                          <Folder className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">
                          {project.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {typeMeta.label} · {project.marketplace}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Project actions"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTarget(project);
                            setEditName(project.name);
                            setEditDescription(project.description || "");
                            setEditStatus(project.status);
                          }}
                        >
                          <Edit3 className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        {project.status !== "active" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatus(project, "active");
                            }}
                          >
                            <ExternalLink className="size-4" />
                            Mark active
                          </DropdownMenuItem>
                        )}
                        {project.status !== "archived" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatus(project, "archived");
                            }}
                          >
                            <Archive className="size-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {project.status === "archived" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatus(project, "draft");
                            }}
                          >
                            <RotateCcw className="size-4" />
                            Restore
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateProject(project);
                          }}
                        >
                          <Copy className="size-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {project.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant={statusMeta.variant}>
                      {statusMeta.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {project._count?.products ?? 0} products
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated{" "}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New project dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Create a project to organize listings, research, or campaigns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Fall 2026 Wooden Clock Line"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What's this project about?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="listing">Listing</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Marketplace</Label>
                <Select
                  value={newMarketplace}
                  onValueChange={setNewMarketplace}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="etsy">Etsy</SelectItem>
                    <SelectItem value="shopify">Shopify</SelectItem>
                    <SelectItem value="amazon">Amazon</SelectItem>
                    <SelectItem value="ebay">eBay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createProject}
              disabled={creating}
              className="brand-gradient text-white"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              Update the project details or status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={savingEdit}
              className="brand-gradient text-white"
            >
              {savingEdit ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Edit3 className="size-4" />
              )}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog
        open={!!detailTarget}
        onOpenChange={(o) => !o && setDetailTarget(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate">
                  {detailTarget?.name}
                </DialogTitle>
                <DialogDescription>
                  {detailTarget?.description || "No description."}
                </DialogDescription>
              </div>
              {detailTarget && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setImportOpen(true)}
                  >
                    <Upload className="size-3.5" />
                    Import
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      window.open(
                        `/api/projects/${detailTarget.id}/export?format=json`,
                        "_blank"
                      )
                    }
                  >
                    <Download className="size-3.5" />
                    JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      window.open(
                        `/api/projects/${detailTarget.id}/export?format=csv`,
                        "_blank"
                      )
                    }
                  >
                    <FileSpreadsheet className="size-3.5" />
                    CSV
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Products</h4>
              <Badge variant="outline">
                {detailProducts.length} total
              </Badge>
            </div>
            {detailLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : detailProducts.length === 0 ? (
              <div className="rounded-md border border-dashed py-8 text-center">
                <Package className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No products saved to this project yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the Listing Generator and click &quot;Save to project&quot;.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto scroll-thin pr-1">
                {detailProducts.map((p) => {
                  const preview = stripMarkdown(p.description || "");
                  // Try to extract image data URL from product metadata
                  let imageDataUrl: string | null = null;
                  if (p.metadata) {
                    try {
                      const meta = JSON.parse(p.metadata);
                      if (meta.imageDataUrl) imageDataUrl = meta.imageDataUrl;
                      if (meta.type === "image" && meta.imageDataUrl) {
                        // Saved-from-Image-Studio product
                      }
                    } catch {
                      // ignore
                    }
                  }
                  const isImage = p.category === "ai-generated-image";
                  return (
                    <li
                      key={p.id}
                      className="group rounded-md border p-3 text-sm hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {imageDataUrl && (
                          <div className="size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                            <img
                              src={imageDataUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{p.title}</p>
                          {preview && !isImage && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {preview}
                            </p>
                          )}
                          {isImage && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              AI-generated image
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.price !== null && (
                            <span className="text-xs font-semibold whitespace-nowrap">
                              ${p.price.toFixed(2)}
                            </span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              detailTarget &&
                              deleteProduct(detailTarget.id, p.id)
                            }
                            aria-label="Delete product"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="capitalize">
                          {p.status}
                        </Badge>
                        {p.category && <span>· {p.category}</span>}
                      </div>
                      {p.description && !isImage && p.description.length > 80 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-primary transition-colors">
                            View full content
                          </summary>
                          <div className="mt-2 rounded-md border bg-muted/30 p-2 prose prose-xs dark:prose-invert max-w-none prose-pre:bg-background prose-pre:text-foreground">
                            <ReactMarkdown>{p.description}</ReactMarkdown>
                          </div>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import products into &quot;{detailTarget?.name}&quot;</DialogTitle>
            <DialogDescription>
              Paste CSV or JSON below. CSV should have headers:
              title,description,category,price,currency,sku,status,tags. JSON
              can be an array of products or <code>{`{ products: [...] }`}</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={
                "title,description,category,price,currency,sku,status,tags\n" +
                "Walnut Wall Clock,Minimalist 12in wall clock,Home Decor,89.00,USD,,listing,\"walnut,clock,minimalist\""
              }
              rows={10}
              className="font-mono text-xs"
              disabled={importing}
            />
            <p className="text-xs text-muted-foreground">
              Max 500 products per import. Each product must have a title (max
              200 chars). Tags can be JSON array, pipe-separated, or
              comma-separated.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !importText.trim()}
              className="brand-gradient text-white"
            >
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Strip markdown syntax for a clean preview line. Code fences (```)
 * are removed entirely so saved listings (which often contain ```json
 * blocks from the Listing Agent) show readable text in the truncated preview.
 * If the content is JSON, extracts human-readable fields (title, description).
 */
function stripMarkdown(md: string): string {
  // First, extract code-block content (```lang ... ```)
  const codeBlockMatch = md.match(/```[a-zA-Z]*\n?([\s\S]*?)```/);
  let content = codeBlockMatch ? codeBlockMatch[1].trim() : md;

  // If the content looks like JSON, try to parse it and extract the
  // human-readable fields (title, description).
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        const parts: string[] = [];
        if (parsed.title) parts.push(String(parsed.title));
        if (parsed.description) parts.push(String(parsed.description));
        if (parts.length) return parts.join(" — ");
      }
    } catch {
      // Not valid JSON, fall through to markdown stripping.
    }
  }

  return content
    .replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, (_m, code) => code.trim() + " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}
