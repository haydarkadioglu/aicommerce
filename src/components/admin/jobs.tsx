"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListChecks, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Job = {
  id: string;
  queue: string;
  type: string;
  status: string;
  progress: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  user?: { email: string; name: string | null } | null;
};

export function AdminJobs() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const path =
        statusFilter === "all"
          ? "/api/admin/jobs"
          : `/api/admin/jobs?status=${statusFilter}`;
      const data = await apiFetch<{ jobs: Job[] }>(path);
      setJobs(data.jobs || []);
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
     
  }, [statusFilter]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Background Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Queue, monitor, and debug background tasks.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <ListChecks className="size-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No jobs found.</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Queue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(j.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{j.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {j.queue}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={j.status} />
                      </TableCell>
                      <TableCell className="w-32">
                        <div className="flex items-center gap-2">
                          <Progress value={j.progress * 100} className="flex-1" />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(j.progress * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {j.startedAt ? new Date(j.startedAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {j.completedAt ? new Date(j.completedAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {j.user?.email || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: any = {
    queued: "secondary",
    running: "default",
    completed: "default",
    failed: "destructive",
    cancelled: "outline",
  }[status];
  const cls =
    status === "running"
      ? "bg-emerald-500 text-white border-transparent"
      : status === "completed"
      ? "bg-emerald-500/80 text-white border-transparent"
      : "";
  return (
    <Badge variant={variant || "outline"} className={"text-[10px] " + cls}>
      {status}
    </Badge>
  );
}
