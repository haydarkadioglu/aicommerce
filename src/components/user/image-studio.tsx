"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Download,
  Wand2,
  RotateCcw,
  Save,
  Clock,
  Cpu,
  BookmarkPlus,
  FolderPlus,
  Check,
} from "lucide-react";

const SIZES = [
  { value: "1024x1024", label: "Square · 1024×1024", w: 1024, h: 1024 },
  { value: "1344x768", label: "Landscape · 1344×768", w: 1344, h: 768 },
  { value: "1152x864", label: "Landscape · 1152×864", w: 1152, h: 864 },
  { value: "1440x720", label: "Wide · 1440×720", w: 1440, h: 720 },
  { value: "768x1344", label: "Portrait · 768×1344", w: 768, h: 1344 },
  { value: "864x1152", label: "Portrait · 864×1152", w: 864, h: 1152 },
  { value: "720x1440", label: "Tall · 720×1440", w: 720, h: 1440 },
];

const PRESETS = [
  {
    label: "Hero product on white",
    prompt:
      "Professional e-commerce hero shot of {PRODUCT} on a clean white background, soft studio lighting, sharp focus, high detail, premium product photography",
  },
  {
    label: "Lifestyle in-use",
    prompt:
      "Lifestyle photograph of {PRODUCT} being used in a cozy modern home setting, natural daylight, shallow depth of field, Instagram-worthy aesthetic",
  },
  {
    label: "Flatlay overhead",
    prompt:
      "Overhead flatlay of {PRODUCT} on a marble surface with complementary props, soft directional light, top-down view, Pinterest-style composition",
  },
  {
    label: "Branded packaging",
    prompt:
      "Premium branded packaging mockup for {PRODUCT}, kraft paper box with minimalist label, sitting on a wood table, soft shadow, e-commerce product shot",
  },
  {
    label: "Dark moody catalog",
    prompt:
      "Dark moody product photograph of {PRODUCT}, single dramatic light from one side, deep shadows, premium catalog aesthetic, minimal background",
  },
  {
    label: "Pastel Instagram",
    prompt:
      "Soft pastel Instagram-style photo of {PRODUCT}, blush pink and cream tones, dreamy bokeh background, lifestyle commercial photography",
  },
];

type GeneratedImage = {
  image: string; // data URL
  path: string; // /download path
  size: string;
  latencyMs: number;
  prompt: string;
};

export function ImageStudio() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState(
    "Professional e-commerce hero shot of a handcrafted walnut wooden wall clock on a clean white background, soft studio lighting, sharp focus"
  );
  const [size, setSize] = useState("1024x1024");
  const [batchMode, setBatchMode] = useState(false);
  const [batchSizes, setBatchSizes] = useState<string[]>([
    "1024x1024",
    "1344x768",
    "768x1344",
  ]);
  const [batchResults, setBatchResults] = useState<GeneratedImage[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [downloading, setDownloading] = useState(false);

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
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Describe what you want to see.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const data = await apiFetch<{
        image: string;
        path: string;
        size: string;
        latencyMs: number;
      }>("/api/ai/images", {
        method: "POST",
        body: JSON.stringify({ prompt, size }),
      });
      const img: GeneratedImage = {
        ...data,
        prompt,
      };
      setResult(img);
      setHistory((h) => [img, ...h].slice(0, 12));
      toast({ title: "Image generated" });
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateBatch = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Describe what you want to see.",
        variant: "destructive",
      });
      return;
    }
    if (batchSizes.length === 0) {
      toast({
        title: "Select at least one size",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    setBatchResults([]);
    setBatchProgress(0);
    setBatchTotal(batchSizes.length);
    const results: GeneratedImage[] = [];
    for (let i = 0; i < batchSizes.length; i++) {
      const sizeToUse = batchSizes[i];
      try {
        const data = await apiFetch<{
          image: string;
          path: string;
          size: string;
          latencyMs: number;
        }>("/api/ai/images", {
          method: "POST",
          body: JSON.stringify({ prompt, size: sizeToUse }),
        });
        const img: GeneratedImage = { ...data, prompt };
        results.push(img);
        setBatchResults([...results]);
        setHistory((h) => [img, ...h].slice(0, 12));
      } catch (err: any) {
        toast({
          title: `Failed size ${sizeToUse}`,
          description: err?.message,
          variant: "destructive",
        });
      } finally {
        setBatchProgress(i + 1);
      }
    }
    toast({
      title: `Batch complete — ${results.length}/${batchSizes.length} generated`,
    });
    setGenerating(false);
  };

  const toggleBatchSize = (sz: string) => {
    setBatchSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    );
  };

  const download = async (img: GeneratedImage) => {
    setDownloading(true);
    try {
      // Trigger download via the persisted path
      const a = document.createElement("a");
      a.href = img.image;
      a.download = `ai-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({ title: "Download started" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
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
              marketplace: "etsy",
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
          title: `Image: ${result.prompt.slice(0, 60)}${result.prompt.length > 60 ? "…" : ""}`,
          description: result.prompt,
          category: "ai-generated-image",
          tags: ["ai-image", result.size],
          status: "idea",
          metadata: {
            type: "image",
            imageDataUrl: result.image,
            imagePath: result.path,
            size: result.size,
            latencyMs: result.latencyMs,
            prompt: result.prompt,
          },
        }),
      });
      setSaveDialogOpen(false);
      setNewProjectName("");
      toast({
        title: "Image saved to project",
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

  const applyPreset = (presetPrompt: string) => {
    // Replace {PRODUCT} with a default product name
    const filled = presetPrompt.replace(
      "{PRODUCT}",
      "a handcrafted walnut wooden wall clock"
    );
    setPrompt(filled);
  };

  const selectedSize = SIZES.find((s) => s.value === size) || SIZES[0];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
          <ImageIcon className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Image Studio</h2>
          <p className="text-sm text-muted-foreground">
            Generate product photography, lifestyle shots, and marketing visuals
            with AI.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: form */}
        <Card>
          <CardHeader>
            <CardTitle>Describe your image</CardTitle>
            <CardDescription>
              The more detail, the better. Specify subject, style, lighting,
              and mood.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Prompt</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Minimalist walnut wood wall clock on a marble table, soft morning light, top-down view"
                rows={5}
                disabled={generating}
              />
              <p className="text-xs text-muted-foreground">
                {prompt.length}/1500 characters
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Style presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.prompt)}
                    className="rounded-md border bg-card hover:bg-accent hover:border-primary/40 px-3 py-2 text-left text-xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      <Wand2 className="size-3 text-primary" />
                      {p.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Aspect ratio</Label>
                <button
                  type="button"
                  onClick={() => setBatchMode((b) => !b)}
                  className={
                    "text-xs font-medium transition-colors " +
                    (batchMode
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {batchMode ? "Batch mode on" : "Batch multiple sizes?"}
                </button>
              </div>
              {!batchMode ? (
                <Select
                  value={size}
                  onValueChange={setSize}
                  disabled={generating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {SIZES.map((s) => {
                    const checked = batchSizes.includes(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleBatchSize(s.value)}
                        disabled={generating}
                        className={
                          "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs text-left transition-colors " +
                          (checked
                            ? "border-primary bg-primary/5 text-primary"
                            : "hover:bg-accent")
                        }
                      >
                        <span
                          className={
                            "flex size-4 items-center justify-center rounded border " +
                            (checked
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-muted-foreground/40")
                          }
                        >
                          {checked && <Check className="size-3" />}
                        </span>
                        <span className="flex-1 truncate">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {batchMode && batchSizes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Will generate {batchSizes.length} image
                  {batchSizes.length === 1 ? "" : "s"} sequentially (~{batchSizes.length * 12}{" "}
                  seconds total).
                </p>
              )}
            </div>

            <Button
              onClick={batchMode ? generateBatch : generate}
              disabled={generating || !prompt.trim() || (batchMode && batchSizes.length === 0)}
              className="w-full brand-gradient text-white"
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {generating
                ? batchMode
                  ? `Generating ${batchProgress}/${batchTotal}...`
                  : "Generating..."
                : batchMode
                ? `Generate ${batchSizes.length} image${batchSizes.length === 1 ? "" : "s"}`
                : "Generate image"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {batchMode
                ? "Batch generation runs one size at a time."
                : "Generation typically takes 8-15 seconds."}
            </p>
          </CardContent>
        </Card>

        {/* Right: result or empty state */}
        <div className="space-y-4">
          {generating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Generating image...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton
                  className="w-full"
                  style={{ aspectRatio: `${selectedSize.w} / ${selectedSize.h}` }}
                />
                <p className="mt-3 text-xs text-muted-foreground text-center">
                  Don't refresh — AI image generation can take 10-15 seconds.
                </p>
              </CardContent>
            </Card>
          )}

          {!generating && result && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Generated image</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Cpu className="size-3" />
                      zai-image
                    </span>
                    <Badge variant="outline">{result.size}</Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {result.latencyMs} ms
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="overflow-hidden rounded-md border bg-muted/30"
                  style={{
                    aspectRatio: `${selectedSize.w} / ${selectedSize.h}`,
                  }}
                >
                  <img
                    src={result.image}
                    alt={result.prompt.slice(0, 100)}
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  <span className="font-medium">Prompt:</span> {result.prompt}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download(result)}
                    disabled={downloading}
                  >
                    <Download className="size-4" />
                    Download PNG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPrompt(result.prompt);
                      generate();
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Regenerate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setSaveDialogOpen(true)}
                  >
                    <Save className="size-4" />
                    Save to project
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!generating && !result && batchResults.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <ImageIcon className="size-12 text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-semibold">No image yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Describe your product, pick an aspect ratio, then click
                  <strong> Generate image</strong>.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Batch results */}
          {batchMode && batchResults.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Batch results ({batchResults.length}
                    {batchTotal > 0 ? `/${batchTotal}` : ""})
                  </CardTitle>
                  {generating && (
                    <Badge variant="outline" className="gap-1">
                      <Loader2 className="size-3 animate-spin" />
                      {batchProgress}/{batchTotal}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {batchResults.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setResult(img)}
                      className="group relative overflow-hidden rounded-md border hover:border-primary/60 transition-all"
                    >
                      <img
                        src={img.image}
                        alt=""
                        className="w-full object-cover aspect-square group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {img.size}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Session history ({history.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto scroll-thin">
                  {history.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setResult(img)}
                      className="aspect-square overflow-hidden rounded-md border hover:border-primary/60 hover:ring-2 hover:ring-primary/30 transition-all"
                    >
                      <img
                        src={img.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Save to project dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save image to project</DialogTitle>
            <DialogDescription>
              Store this generated image as a product in one of your projects.
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
              Save image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
