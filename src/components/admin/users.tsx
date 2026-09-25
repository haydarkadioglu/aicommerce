"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Loader2, RefreshCw, ShieldCheck, UserCircle } from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  roleAssignments: { role: { id: string; key: string; name: string } }[];
};

type Role = { id: string; key: string; name: string };

export function AdminUsers() {
  const { apiFetch } = useApiClient();
  const { toast } = useToast();
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const setView = useAppStore((s) => s.setView);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [userData, roleData] = await Promise.all([
        apiFetch<{ users: User[] }>("/api/admin/users"),
        apiFetch<{ roles: Role[] }>("/api/admin/roles"),
      ]);
      setUsers(userData.users || []);
      setRoles(roleData.roles || []);
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

  const filtered = users.filter((u) => {
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) && !u.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const saveUser = async (data: {
    name?: string;
    status?: string;
    roleKeys?: string[];
  }) => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/users?userId=${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      toast({ title: "User updated" });
      setEditing(null);
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

  const createUser = async (data: {
    email: string;
    name?: string;
    password: string;
    roleKey: string;
    status: string;
  }) => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast({ title: "User created" });
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

  const deleteUser = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/users?userId=${deleting.id}`, {
        method: "DELETE",
      });
      toast({ title: "User deleted" });
      setDeleting(null);
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

  const impersonateUser = async (u: User) => {
    if (!confirm(`Sign in as ${u.email}? You'll be able to see their workspace. This action is logged.`))
      return;
    try {
      const data = await apiFetch<{
        user: any;
        accessToken: string;
        refreshToken: string;
        impersonatedBy: string;
      }>("/api/admin/impersonate", {
        method: "POST",
        body: JSON.stringify({ userId: u.id }),
      });
      startImpersonation(
        data.user,
        {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        },
        data.impersonatedBy
      );
      toast({
        title: `Now viewing as ${u.email}`,
        description: `Click "Exit impersonation" in the top bar to return to your admin account.`,
      });
      setView("dashboard");
    } catch (err: any) {
      toast({
        title: "Failed to impersonate",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">Manage platform users and roles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreating(true)} className="brand-gradient text-white">
            <Plus className="size-4" />
            New user
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="BANNED">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No users found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.name || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roleAssignments.map((ra) => (
                          <Badge key={ra.role.id} variant="secondary" className="text-[10px]">
                            {ra.role.key}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Impersonate user"
                          title="Sign in as this user (for support)"
                          onClick={() => impersonateUser(u)}
                          disabled={u.email === "admin@ai-commerce.os"}
                        >
                          <UserCircle className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit user"
                          onClick={() => setEditing(u)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete user"
                          onClick={() => setDeleting(u)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editing && (
        <EditUserDialog
          user={editing}
          roles={roles}
          onClose={() => setEditing(null)}
          onSave={saveUser}
          saving={saving}
        />
      )}

      {/* Create dialog */}
      {creating && (
        <CreateUserDialog
          roles={roles}
          onClose={() => setCreating(false)}
          onSave={createUser}
          saving={saving}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleting?.email}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: any = {
    ACTIVE: "default",
    SUSPENDED: "secondary",
    PENDING: "outline",
    BANNED: "destructive",
  }[status];
  return <Badge variant={variant}>{status}</Badge>;
}

function EditUserDialog({
  user,
  roles,
  onClose,
  onSave,
  saving,
}: {
  user: User;
  roles: Role[];
  onClose: () => void;
  onSave: (d: { name?: string; status?: string; roleKeys?: string[] }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(user.name || "");
  const [status, setStatus] = useState(user.status);
  const [roleKeys, setRoleKeys] = useState<string[]>(
    user.roleAssignments.map((ra) => ra.role.key)
  );

  const toggleRole = (key: string) => {
    setRoleKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="BANNED">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Roles</Label>
            <div className="space-y-1.5">
              {roles.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={roleKeys.includes(r.key)}
                    onChange={() => toggleRole(r.key)}
                    className="size-4"
                  />
                  <span className="text-sm font-medium">{r.name}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">{r.key}</Badge>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({ name, status, roleKeys })}
            disabled={saving}
            className="brand-gradient text-white"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({
  roles,
  onClose,
  onSave,
  saving,
}: {
  roles: Role[];
  onClose: () => void;
  onSave: (d: {
    email: string;
    name?: string;
    password: string;
    roleKey: string;
    status: string;
  }) => void;
  saving: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [roleKey, setRoleKey] = useState("user");
  const [status, setStatus] = useState("ACTIVE");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>Create a new platform user.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Password (min 8 chars)</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={roleKey} onValueChange={setRoleKey}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.key}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="BANNED">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({ email, name, password, roleKey, status })}
            disabled={saving || !email || !password}
            className="brand-gradient text-white"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
