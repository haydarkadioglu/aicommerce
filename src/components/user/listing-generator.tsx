"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileText, Sparkles, Loader2, Copy, Check, Cpu, Zap, Clock, BookmarkPlus, FolderPlus } from "lucide-react";

const MARKETPLACES = [
  { value: "etsy", label: "Etsy" },
  { value: "shopify", label: "Shopify" },
  { value: "amazon", label: "Amazon" },
  { value: "ebay", label: "eBay" },
];

export function ListingGenerator() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [marketplace, setMarketplace] = useState("etsy");
  const [title, setTitle] = useState("Handcrafted Walnut Wood Wall Clock");
  const [description, setDescription] = useState("Minimalist 12-inch wall clock made from sustainably-sourced American walnut. Silent quartz movement. Personalized engraving available.");
  const [materials, setMaterials] = useState("walnut wood, brass hands, glass face");
  const [tags, setTags] = useState("wooden clock, wall clock, minimalist, walnut, personalized gift");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    content: string;
    model?: string;
    tokensIn?: number;
    tokensOut?: number;
    latencyMs?: number;
  } | null>(null);

  // Save to project state
  const [projects, setProjects] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState("");
  const [saving, setSaving] = useState(false);

  // Load user's projects for the save dialog
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{
          projects: Array<{ id: string; name: string }>;
        }>("/api/projects");
        setProjects(data.projects || []);
        if (data.projects?.[0]) setSelectedProjectId(data.projects[0].id);
      } catch {
        // ignore
      }
    })();
  }, [apiFetch]);

  const generate = async () => {
    if (!title.trim() && !description.trim()) {
      toast({
        title: "Need more info",
        description: "Provide at least a product title or description.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const productContext = [
        title && `Title: ${title}`,
        description && `Description: ${description}`,
        materials && `Materials: ${materials}`,
        tags && `Tags: ${tags}`,
      ]
        .filter(Boolean)
        .join("\n");

      const data = await apiFetch<{
        content: string;
        model: string;
        tokensIn: number;
        tokensOut: number;
        latencyMs: number;
      }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          agentKey: "listing",
          message: "Generate a marketplace-optimized listing.",
          variables: { marketplace, productContext },
        }),
      });
      setResult(data);
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        variant: "destructive",
      });
    }
  };

  const saveToProject = async () => {
    if (!result) return;
    setSaving(true);
    try {
      let projectId = selectedProjectId;

      // If user typed a new project name, create it first.
      if (newProjectName.trim() && !projectId) {
        const created = await apiFetch<{ project: { id: string } }>(
          "/api/projects",
          {
            method: "POST",
            body: JSON.stringify({
              name: newProjectName.trim(),
              type: "listing",
              marketplace,
            }),
          }
        );
        projectId = created.project.id;
      }

      if (!projectId) {
        toast({
          title: "Select or create a project",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      await apiFetch(`/api/projects/${projectId}/products`, {
        method: "POST",
        body: JSON.stringify({
          title: title || "Generated listing",
          description: result.content,
          category: marketplace,
          tags: tags
            ? tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
          status: "listing",
          metadata: {
            model: result.model,
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
            latencyMs: result.latencyMs,
            marketplace,
            materials,
          },
        }),
      });
      setSaveDialogOpen(false);
      setNewProjectName("");
      toast({
        title: "Saved to project",
        description: "You can find it in Saved Projects.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
          <FileText className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Listing Generator</h2>
          <p className="text-sm text-muted-foreground">
            Generate marketplace-ready listings with the Listing Agent.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>
              The more context you provide, the better the listing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Marketplace</Label>
              <Select value={marketplace} onValueChange={setMarketplace}>
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
              <Label>Product title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Handmade wooden wall clock"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Product description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe materials, dimensions, style, target audience…"
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Materials (comma-separated)</Label>
                <Input
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder="oak, brass, natural oil"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="minimalist, boho, gift"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              onClick={generate}
              disabled={loading}
              className="w-full brand-gradient text-white"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate Listing
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Generating listing...
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Generated Listing</CardTitle>
                  <div className="flex items-center gap-2">
                    {result.model && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Cpu className="size-3" />
                        {result.model}
                      </span>
                    )}
                    {(result.tokensIn || result.tokensOut) && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Zap className="size-3" />
                        {(result.tokensIn ?? 0) + (result.tokensOut ?? 0)} tok
                      </span>
                    )}
                    {result.latencyMs !== undefined && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {result.latencyMs} ms
                      </span>
                    )}
                    <Button size="sm" variant="outline" onClick={copy}>
                      {copied ? (
                        <Check className="size-3" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      className="brand-gradient text-white"
                      onClick={() => setSaveDialogOpen(true)}
                    >
                      <BookmarkPlus className="size-3" />
                      Save to project
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:bg-muted prose-pre:text-foreground prose-headings:mt-3 prose-headings:mb-2">
                  <ReactMarkdown>{result.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !result && (
            <Card className="border-dashed">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <FileText className="size-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Fill in the form and click <strong>Generate Listing</strong> to see results here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Save to project dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to project</DialogTitle>
            <DialogDescription>
              Store this listing as a product inside one of your projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {projects.length > 0 && (
              <div className="space-y-1.5">
                <Label>Existing project</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={(v) => {
                    setSelectedProjectId(v);
                    setNewProjectName("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a project…" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>
                {projects.length > 0
                  ? "Or create a new project"
                  : "New project name"}
              </Label>
              <Input
                value={newProjectName}
                onChange={(e) => {
                  setNewProjectName(e.target.value);
                  if (e.target.value) setSelectedProjectId("");
                }}
                placeholder="Project name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveToProject}
              disabled={saving || (!selectedProjectId && !newProjectName.trim())}
              className="brand-gradient text-white"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : newProjectName.trim() ? (
                <FolderPlus className="size-4" />
              ) : (
                <BookmarkPlus className="size-4" />
              )}
              Save listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
