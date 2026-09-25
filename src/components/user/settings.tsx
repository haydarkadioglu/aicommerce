"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  Moon,
  Sun,
  Laptop,
  Key,
  ShieldCheck,
  Copy,
  Check,
  Trash2,
  Plus,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "next-themes";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPreview: string;
  scopes: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export function UserSettings() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || "");
  const [image, setImage] = useState(user?.image || "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // New API key dialog
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadApiKeys = async () => {
    try {
      const data = await apiFetch<{ apiKeys: ApiKeyRow[] }>(
        "/api/auth/api-keys"
      );
      setApiKeys(data.apiKeys || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<{ user: any }>("/api/auth/me");
        if (data.user) {
          setName(data.user.name || "");
          setImage(data.user.image || "");
          setUser(data.user);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
      loadApiKeys();
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const data = await apiFetch<{ user: any }>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, image }),
      });
      if (data.user) setUser(data.user);
      toast({ title: "Profile saved" });
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

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "At least 8 characters required.",
        variant: "destructive",
      });
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      toast({ title: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Failed to change password",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setCreatingKey(true);
    try {
      const data = await apiFetch<{ apiKey: ApiKeyRow; rawKey: string }>(
        "/api/auth/api-keys",
        {
          method: "POST",
          body: JSON.stringify({
            name: newKeyName,
            scopes: newKeyScopes || undefined,
          }),
        }
      );
      setApiKeys((prev) => [data.apiKey, ...prev]);
      setRevealedKey(data.rawKey);
      setNewKeyName("");
      setNewKeyScopes("");
      toast({ title: "API key created" });
    } catch (err: any) {
      toast({
        title: "Failed to create key",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      await apiFetch(`/api/auth/api-keys?keyId=${keyId}`, {
        method: "DELETE",
      });
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast({ title: "API key revoked" });
    } catch (err: any) {
      toast({
        title: "Failed to revoke",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const copyKey = async () => {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const initials = (
    user?.name?.[0] ||
    user?.email?.[0] ||
    "?"
  ).toUpperCase();

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile, theme, and account.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Public information about your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full brand-gradient text-white text-lg font-semibold">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.email}</p>
              <div className="flex gap-1.5 mt-1">
                {user?.roles?.map((r) => (
                  <Badge
                    key={r}
                    variant="secondary"
                    className="capitalize"
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Avatar URL</Label>
            <Input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://…"
              type="url"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
          <Button
            onClick={saveProfile}
            disabled={saving}
            className="brand-gradient text-white"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save profile
          </Button>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the platform looks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <span className="flex items-center gap-2">
                    <Sun className="size-4" /> Light
                  </span>
                </SelectItem>
                <SelectItem value="dark">
                  <span className="flex items-center gap-2">
                    <Moon className="size-4" /> Dark
                  </span>
                </SelectItem>
                <SelectItem value="system">
                  <span className="flex items-center gap-2">
                    <Laptop className="size-4" /> System
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Change your password. Use at least 8 characters with upper, lower, and a number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Current password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              disabled={savingPassword}
            />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={savingPassword}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm new password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={savingPassword}
            />
          </div>
          <Button
            variant="outline"
            onClick={changePassword}
            disabled={savingPassword || !currentPassword || !newPassword}
          >
            {savingPassword ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            Update password
          </Button>
        </CardContent>
      </Card>

      {/* API keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Use API keys to access the platform programmatically.
              </CardDescription>
            </div>
            <Dialog
              open={apiKeyDialogOpen}
              onOpenChange={(o) => {
                setApiKeyDialogOpen(o);
                if (!o) setRevealedKey(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="brand-gradient text-white">
                  <Plus className="size-4" />
                  New key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {revealedKey ? "API key created" : "Create new API key"}
                  </DialogTitle>
                  <DialogDescription>
                    {revealedKey
                      ? "Copy this key now — it won't be shown again."
                      : "Give your key a name so you can identify it later."}
                  </DialogDescription>
                </DialogHeader>
                {revealedKey ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-md border bg-muted p-2">
                      <code className="flex-1 break-all text-xs">
                        {revealedKey}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={copyKey}
                        aria-label="Copy key"
                      >
                        {copied ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                      Treat this key like a password. Store it securely.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. Production script"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Scopes (optional)</Label>
                      <Input
                        value={newKeyScopes}
                        onChange={(e) => setNewKeyScopes(e.target.value)}
                        placeholder="comma-separated, e.g. ai:chat,commerce:read"
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  {revealedKey ? (
                    <Button
                      onClick={() => {
                        setApiKeyDialogOpen(false);
                        setRevealedKey(null);
                      }}
                    >
                      Done
                    </Button>
                  ) : (
                    <Button
                      onClick={createApiKey}
                      disabled={creatingKey}
                      className="brand-gradient text-white"
                    >
                      {creatingKey ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Key className="size-4" />
                      )}
                      Create key
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Key className="size-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No API keys yet.</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Create one to start using the platform API.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {apiKeys.map((k) => (
                <li
                  key={k.id}
                  className="group flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{k.name}</span>
                      <code className="text-xs text-muted-foreground font-mono">
                        ••••{k.keyPreview}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt
                        ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                        : ""}
                      {k.expiresAt
                        ? ` · Expires ${new Date(k.expiresAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => revokeApiKey(k.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    aria-label="Revoke key"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
