import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:roles:read");
  if (!guard.ok) return guard.response;
  const roles = await db.role.findMany({
    include: {
      _count: { select: { users: true, permissions: true } },
      permissions: { include: { permission: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ roles });
}

const CreateSchema = z.object({
  key: z.string().min(2),
  name: z.string(),
  description: z.string().optional(),
  permissionKeys: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const guard = await requireAdmin(req, "admin:roles:write");
  if (!guard.ok) return guard.response;
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  const { key, name, description, permissionKeys } = parsed.data;
  const role = await db.role.create({
    data: {
      key,
      name,
      description,
      isSystem: false,
    },
  });
  if (permissionKeys.length) {
    const perms = await db.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    for (const p of perms) {
      await db.rolePermission.create({
        data: { roleId: role.id, permissionId: p.id },
      });
    }
  }
  await logger.audit({
    userId: guard.user.id,
    action: "admin.role.create",
    category: "admin",
    resourceId: role.id,
    metadata: { key, name },
  });
  return NextResponse.json({ role });
}

const UpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  permissionKeys: z.array(z.string()).optional(),
});

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req, "admin:roles:write");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const roleId = url.searchParams.get("roleId");
  if (!roleId)
    return NextResponse.json({ error: "roleId required" }, { status: 400 });
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  const existing = await db.role.findUnique({ where: { id: roleId } });
  if (!existing)
    return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const { name, description, permissionKeys } = parsed.data;
  const updated = await db.role.update({
    where: { id: roleId },
    data: { ...(name ? { name } : {}), ...(description !== undefined ? { description } : {}) },
  });

  if (permissionKeys) {
    await db.rolePermission.deleteMany({ where: { roleId } });
    const perms = await db.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    for (const p of perms) {
      await db.rolePermission.create({
        data: { roleId, permissionId: p.id },
      });
    }
  }

  await logger.audit({
    userId: guard.user.id,
    action: "admin.role.update",
    category: "admin",
    resourceId: roleId,
    metadata: parsed.data,
  });
  return NextResponse.json({ role: updated });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin(req, "admin:roles:write");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const roleId = url.searchParams.get("roleId");
  if (!roleId)
    return NextResponse.json({ error: "roleId required" }, { status: 400 });
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (role?.isSystem)
    return NextResponse.json(
      { error: "Cannot delete system role" },
      { status: 400 }
    );
  await db.role.delete({ where: { id: roleId } });
  await logger.audit({
    userId: guard.user.id,
    action: "admin.role.delete",
    category: "admin",
    resourceId: roleId,
  });
  return NextResponse.json({ ok: true });
}
