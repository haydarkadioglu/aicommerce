"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useAppStore } from "@/stores/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Bot,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  FolderKanban,
  CheckCircle2,
  Circle,
  Sparkles,
  X,
  ArrowRight,
} from "lucide-react";

type Step = {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  link: string;
  icon: string;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chat: Bot,
  message: MessageSquare,
  file: FileText,
  image: ImageIcon,
  folder: FolderKanban,
};

export function OnboardingCard() {
  const { apiFetch } = useApiClient();
  const setView = useAppStore((s) => s.setView);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{
          steps: Step[];
          completedCount: number;
          totalCount: number;
          isComplete: boolean;
        }>("/api/onboarding");
        setSteps(data.steps || []);
        setCompletedCount(data.completedCount);
        setTotalCount(data.totalCount);
        setIsComplete(data.isComplete);
        // Auto-dismiss if complete
        if (data.isComplete) {
          setDismissed(true);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [apiFetch]);

  if (dismissed) return null;

  if (loading) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4">
          <Skeleton className="h-6 w-48 mb-3" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isComplete) return null;

  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent">
      {/* Decorative gradient accent in corner */}
      <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg brand-gradient text-white">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Welcome to AI Commerce OS</h3>
              <p className="text-xs text-muted-foreground">
                Complete these steps to get the most out of your workspace.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {completedCount}/{totalCount}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss welcome card"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        <Progress value={pct} className="h-1.5 mb-4" />

        <ul className="space-y-1.5">
          {steps.map((step) => {
            const Icon = ICONS[step.icon] || Sparkles;
            return (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => setView(step.link as any)}
                  className={
                    "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors " +
                    (step.completed
                      ? "opacity-60"
                      : "hover:bg-accent/50")
                  }
                >
                  <span
                    className={
                      "flex size-7 items-center justify-center rounded-md shrink-0 " +
                      (step.completed
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-primary/10 text-primary")
                    }
                  >
                    {step.completed ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        "text-sm font-medium " +
                        (step.completed ? "line-through" : "")
                      }
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </p>
                  </div>
                  {!step.completed && (
                    <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
