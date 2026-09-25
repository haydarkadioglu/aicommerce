"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2, ShieldCheck, Trash2, RefreshCw } from "lucide-react";

type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: Permission }[];
  _count: { users: number; permissions: number };
};

type Permission = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  _count?: { roles: number };
};

export function AdminRoles() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [roleData, permData] = await Promise.all([
        apiFetch<{ roles: Role[] }>("/api/admin/roles"),
        apiFetch<{ permissions: Permission[] }>("/api/admin/permissions"),
      ]);
      setRoles(roleData.roles || []);
      setPermissions(permData.permissions || []);
      if (roleData.roles?.length && !selectedRoleId) {
        setSelectedRoleId(roleData.roles[0].id);
      }
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
     
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const selectedPermKeys = new Set(
    selectedRole?.permissions.map((p) => p.permission.key) || []
  );

  // Group permissions by category
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  const togglePerm = async (key: string) => {
    if (!selectedRole) return;
    const next = Array.from(
      new Set(
        selectedPermKeys.has(key)
          ? [...selectedPermKeys].filter((k) => k !== key)
          : [...selectedPermKeys, key]
      )
    );
    setSaving(true);
    try {
      await apiFetch(`/api/admin/roles?roleId=${selectedRole.id}`, {
        method: "PATCH",
        body: JSON.stringify({ permissionKeys: next }),
      });
      toast({ title: "Permissions updated" });
      load();
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createRole = async (data: {
    key: string;
    name: string;
    description?: string;
    permissionKeys: string[];
  }) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast({ title: "Role created" });
      setCreating(false);
      load();
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/roles?roleId=${roleId}`, {
        method: "DELETE",
      });
      toast({ title: "Role deleted" });
      if (selectedRoleId === roleId) setSelectedRoleId(null);
      load();
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">
            Manage roles and their permissions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreating(true)} className="brand-gradient text-white">
            <Plus className="size-4" />
            New role
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Roles list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roles</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ul className="space-y-1 max-h-96 overflow-y-auto scroll-thin">
              {roles.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedRoleId(r.id)}
                    className={
                      "w-full text-left rounded-md p-2 hover:bg-accent transition-colors " +
                      (r.id === selectedRoleId ? "bg-accent" : "")
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.name}</span>
                      {r.isSystem && (
                        <Badge variant="secondary" className="text-[10px]">system</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.key} · {r._count.users} users · {r._count.permissions} perms
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            {selectedRole && !selectedRole.isSystem && (
              <>
                <Separator className="my-2" />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive"
                  onClick={() => deleteRole(selectedRole.id)}
                  disabled={saving}
                >
                  <Trash2 className="size-4" />
                  Delete role
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Permissions
              {selectedRole && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  for <strong>{selectedRole.name}</strong>
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedRole ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a role to manage its permissions.
              </p>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto scroll-thin pr-1">
                {Object.entries(grouped).map(([category, perms]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {category}
                    </p>
                    <div className="space-y-1">
                      {perms.map((p) => {
                        const checked = selectedPermKeys.has(p.key);
                        return (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePerm(p.key)}
                              disabled={saving}
                              className="size-4"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {p.key}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {creating && (
        <CreateRoleDialog
          permissionGroups={grouped}
          onClose={() => setCreating(false)}
          onSave={createRole}
          saving={saving}
        />
      )}
    </div>
  );
}

function CreateRoleDialog({
  permissionGroups,
  onClose,
  onSave,
  saving,
}: {
  permissionGroups: Record<string, Permission[]>;
  onClose: () => void;
  onSave: (d: { key: string; name: string; description?: string; permissionKeys: string[] }) => void;
  saving: boolean;
}) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permKeys, setPermKeys] = useState<string[]>([]);

  const toggle = (k: string) =>
    setPermKeys((prev) =>
      prev.includes(k) ? prev.filter((p) => p !== k) : [...prev, k]
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        <CardHeader>
          <CardTitle>New role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                placeholder="editor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Editor" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Separator />
          <div className="space-y-3 max-h-64 overflow-y-auto scroll-thin pr-1">
            {Object.entries(permissionGroups).map(([cat, perms]) => (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {cat}
                </p>
                <div className="space-y-1">
                  {perms.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={permKeys.includes(p.key)}
                        onChange={() => toggle(p.key)}
                        className="size-4"
                      />
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground font-mono">{p.key}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({ key, name, description, permissionKeys: permKeys })}
            disabled={saving || !key || !name}
            className="brand-gradient text-white"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Create role
          </Button>
        </div>
      </Card>
    </div>
  );
}
