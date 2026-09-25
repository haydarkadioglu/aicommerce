"use client";

import { useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2, Bell, Users } from "lucide-react";

export function AdminNotifications() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<number | null>(null);

  const broadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and message are required.",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    setRecipients(null);
    try {
      const data = await apiFetch<{ ok: boolean; recipients: number }>(
        "/api/admin/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            message,
            type,
            link: link || undefined,
          }),
        }
      );
      setRecipients(data.recipients);
      toast({
        title: "Notification sent",
        description: `Delivered to ${data.recipients} users.`,
      });
      setTitle("");
      setMessage("");
      setLink("");
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Broadcast Notification</h2>
        <p className="text-sm text-muted-foreground">
          Send an in-app notification to all active users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            Compose
          </CardTitle>
          <CardDescription>
            Recipients will receive the notification in their notifications panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Maintenance window scheduled"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="The platform will be in maintenance on Sunday 02:00–04:00 UTC."
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as any)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Link (optional)</Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/dashboard"
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p className="font-medium mb-1">Preview</p>
            <div className="rounded-md border bg-card p-2">
              <div className="flex items-start justify-between gap-2 mb-1">
                <Badge variant="outline" className="capitalize text-[10px]">
                  {type}
                </Badge>
              </div>
              <p className="text-sm font-medium">
                {title || "Notification title"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {message || "Notification message preview"}
              </p>
            </div>
          </div>

          <Button
            onClick={broadcast}
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full brand-gradient text-white"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Broadcast
          </Button>

          {recipients !== null && (
            <div className="flex items-center justify-center gap-2 rounded-md border bg-emerald-500/10 p-3 text-sm">
              <Users className="size-4 text-emerald-500" />
              <span>
                Delivered to{" "}
                <strong className="text-emerald-600 dark:text-emerald-500">
                  {recipients}
                </strong>{" "}
                active users
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
