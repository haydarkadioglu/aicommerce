"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Search,
  Sparkles,
  Loader2,
  Cpu,
  Zap,
  Clock,
  Copy,
  Check,
  Tag,
  Type,
  FileText,
  Hash,
  TrendingUp,
  BookmarkPlus,
  FolderPlus,
} from "lucide-react";

const SUGGESTIONS = [
  "Handcrafted walnut wood wall clock",
  "Personalized pet memorial picture frame",
  "Minimalist linen throw pillow cover",
  "Boho macrame wall hanging plant hanger",
];

const METADATA = [
  { icon: Type, label: "5 Title Candidates", desc: "Under 140 chars each" },
  { icon: Hash, label: "13 Tags", desc: "Each ≤ 20 chars, comma-separated" },
  { icon: FileText, label: "Meta Description", desc: "Under 160 chars" },
  { icon: TrendingUp, label: "10 Long-tail Keywords", desc: "Search intent matched" },
];

type SeoResult = {
  content: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
};

export function SeoStudio() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const setView = useAppStore((s) => s.setView);
  const [product, setProduct] = useState("Handcrafted walnut wood wall clock");
  const [description, setDescription] = useState(
    "Minimalist 12-inch wall clock made from sustainably-sourced American walnut. Silent quartz movement. Personalized engraving available."
  );
  const [marketplace, setMarketplace] = useState("etsy");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeoResult | null>(null);
  const [copied, setCopied] = useState(false);

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

  const saveToProject = async () => {
    if (!result) return;
    setSaving(true);
    try {
      let projectId = selectedProjectId;
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
        toast({ title: "Select or create a project", variant: "destructive" });
        setSaving(false);
        return;
      }
      await apiFetch(`/api/projects/${projectId}/products`, {
        method: "POST",
        body: JSON.stringify({
          title: `SEO: ${product}`.slice(0, 100),
          description: result.content,
          category: "seo-content",
          tags: ["seo", marketplace, "titles", "tags", "keywords"],
          status: "listing",
          metadata: {
            type: "seo",
            model: result.model,
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
            latencyMs: result.latencyMs,
            marketplace,
            product,
          },
        }),
      });
      setSaveDialogOpen(false);
      setNewProjectName("");
      toast({
        title: "SEO content saved to project",
        description: "Find it in Saved Projects.",
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

  const generate = async () => {
    if (!product.trim()) {
      toast({
        title: "Product name required",
        description: "Enter a product name to generate SEO content.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const seoPrompt = `Generate SEO-optimized marketplace content for the following product.

Product: ${product}
Description: ${description || "(none provided)"}
Marketplace: ${marketplace}

Return:
1. 5 title candidates (each under 140 characters, compelling, keyword-rich)
2. 13 tags (each ≤ 20 characters, comma-separated, no duplicates)
3. 1 meta description (under 160 characters)
4. 10 long-tail keywords (search-intent matched)

Format as markdown with clear headings.`;
      const data = await apiFetch<{
        content: string;
        model: string;
        tokensIn: number;
        tokensOut: number;
        latencyMs: number;
      }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          agentKey: "seo",
          message: seoPrompt,
        }),
      });
      setResult(data);
      toast({ title: "SEO content generated" });
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
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
          <Search className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SEO Studio</h2>
          <p className="text-sm text-muted-foreground">
            Generate SEO-optimized titles, tags, descriptions, and keywords with
            the SEO Agent.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Product details</CardTitle>
            <CardDescription>
              The more context you provide, the better the SEO output.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Product name</Label>
              <Input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. Handcrafted walnut wood wall clock"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Product description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Materials, dimensions, style, target audience…"
                rows={4}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Marketplace</Label>
              <Select
                value={marketplace}
                onValueChange={setMarketplace}
                disabled={loading}
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

            <div className="space-y-1.5">
              <Label>Quick examples</Label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent hover:border-primary/40 transition-colors"
                    onClick={() => !loading && setProduct(s)}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={generate}
              disabled={loading || !product.trim()}
              className="w-full brand-gradient text-white"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate SEO Content
            </Button>
          </CardContent>
        </Card>

        {/* Right: what you get */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">What you&apos;ll get</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {METADATA.map((m) => (
                <li key={m.label} className="flex items-start gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                    <m.icon className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Separator className="my-4" />
            <div className="rounded-md bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Tip:</strong> Use specific
                product names and include materials, dimensions, or style for
                better keyword targeting.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result */}
      {loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="size-4 animate-spin text-primary" />
              Generating SEO content...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="size-4 text-primary" />
                SEO Content
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {result.model && (
                    <span className="flex items-center gap-1">
                      <Cpu className="size-3" />
                      {result.model}
                    </span>
                  )}
                  {(result.tokensIn || result.tokensOut) && (
                    <span className="flex items-center gap-1">
                      <Zap className="size-3" />
                      {(result.tokensIn ?? 0) + (result.tokensOut ?? 0)} tok
                    </span>
                  )}
                  {result.latencyMs !== undefined && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {result.latencyMs} ms
                    </span>
                  )}
                </div>
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
                  variant="outline"
                  onClick={() => {
                    setView("listing-generator");
                    toast({
                      title: "Switched to Listing Generator",
                      description:
                        "Your SEO content is saved — copy it from SEO Studio if you want to paste it into the listing form.",
                    });
                  }}
                >
                  <FileText className="size-3" />
                  To Listing
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
            <Search className="size-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Fill in the product details and click{" "}
              <strong>Generate SEO Content</strong> to see titles, tags,
              descriptions, and keywords here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Save to project dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save SEO content to project</DialogTitle>
            <DialogDescription>
              Store this SEO output as a product inside one of your projects.
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
              Save content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
