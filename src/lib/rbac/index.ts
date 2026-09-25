import { db } from "@/lib/db";

/**
 * RBAC helpers — Role/Permission checks.
 *
 * The system is intentionally simple: a `admin` role bypasses all
 * permission checks (see `requirePermission` in session.ts). More
 * roles can be added by inserting into the Role / Permission tables.
 */

export async function listRoles() {
  return db.role.findMany({
    include: {
      _count: { select: { users: true, permissions: true } },
      permissions: { include: { permission: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listPermissions() {
  return db.permission.findMany({
    include: { _count: { select: { roles: true } } },
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
}

export async function assignRoleToUser(userId: string, roleKey: string) {
  const role = await db.role.findUnique({ where: { key: roleKey } });
  if (!role) throw new Error(`Role ${roleKey} not found`);
  await db.userRoleAssignment.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    create: { userId, roleId: role.id },
    update: {},
  });
}

export async function revokeRoleFromUser(userId: string, roleKey: string) {
  const role = await db.role.findUnique({ where: { key: roleKey } });
  if (!role) return;
  if (role.isSystem)
    throw new Error("Cannot revoke system role assignment this way");
  await db.userRoleAssignment.deleteMany({
    where: { userId, roleId: role.id },
  });
}

export async function hasPermission(userId: string, permissionKey: string) {
  const assignments = await db.userRoleAssignment.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });
  if (assignments.some((a) => a.role.key === "admin")) return true;
  return assignments.some((a) =>
    a.role.permissions.some((rp) => rp.permission.key === permissionKey)
  );
}
