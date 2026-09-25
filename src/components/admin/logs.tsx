"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollText, RefreshCw, Server, ShieldHalf } from "lucide-react";

type AuditLog = {
  id: string;
  userId: string | null;
  user: { email: string; name: string | null } | null;
  action: string;
  category: string;
  severity: string;
  resourceId: string | null;
  metadata: string | null;
  createdAt: string;
};

type SystemLog = {
  id: string;
  level: string;
  source: string;
  message: string;
  context: string | null;
  createdAt: string;
};

export function AdminLogs() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [system, setSystem] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ audit: AuditLog[]; system: SystemLog[] }>(
        "/api/admin/logs?limit=100"
      );
      setAudit(data.audit || []);
      setSystem(data.system || []);
    } catch (err: any) {
      toast({
        title: "Failed to load logs",
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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Logs</h2>
          <p className="text-sm text-muted-foreground">
            Audit trail and system events.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">
            <ShieldHalf className="size-3.5" />
            Audit ({audit.length})
          </TabsTrigger>
          <TabsTrigger value="system">
            <Server className="size-3.5" />
            System ({system.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : audit.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No audit logs.
                </div>
              ) : (
                <div className="max-h-[70vh] overflow-y-auto scroll-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Resource</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audit.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <SeverityBadge level={log.severity} />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.action}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {log.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.user?.email || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {log.resourceId ? log.resourceId.slice(0, 8) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : system.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No system logs.
                </div>
              ) : (
                <div className="max-h-[70vh] overflow-y-auto scroll-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {system.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <SeverityBadge level={log.level} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {log.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="flex items-start gap-1.5">
                              <ScrollText className="size-3 text-muted-foreground mt-0.5 shrink-0" />
                              <span className="font-mono">{log.message}</span>
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SeverityBadge({ level }: { level: string }) {
  const variant: any = {
    info: "secondary",
    debug: "outline",
    warn: "outline",
    warning: "outline",
    error: "destructive",
    critical: "destructive",
  }[level.toLowerCase()];
  return (
    <Badge variant={variant || "outline"} className="text-[10px]">
      {level}
    </Badge>
  );
}
