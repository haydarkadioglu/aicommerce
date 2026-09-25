import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { hashPassword } from "@/lib/auth/password";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:users:read");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const users = await db.user.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { email: { contains: q } },
                { name: { contains: q } },
              ],
            }
          : {},
        status ? { status } : {},
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      roleAssignments: { include: { role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ users });
}

const CreateSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(8),
  roleKey: z.string().default("user"),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING", "BANNED"]).default("ACTIVE"),
});

export async function POST(req: Request) {
  const guard = await requireAdmin(req, "admin:users:write");
  if (!guard.ok) return guard.response;
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const { email, name, password, roleKey, status } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      status,
      emailVerifiedAt: new Date(),
    },
    include: { roleAssignments: { include: { role: true } } },
  });

  // Role assignment (separate, since nested create with async is tricky in TS)
  const role = await db.role.findUnique({ where: { key: roleKey } });
  if (role) {
    await db.userRoleAssignment.create({
      data: { userId: user.id, roleId: role.id },
    });
  }

  await logger.audit({
    userId: guard.user.id,
    action: "admin.user.create",
    category: "admin",
    resourceId: user.id,
    metadata: { email: user.email, roleKey },
  });
  return NextResponse.json({ user });
}

const UpdateSchema = z.object({
  name: z.string().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING", "BANNED"]).optional(),
  roleKeys: z.array(z.string()).optional(),
});

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req, "admin:users:write");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  const { name, status, roleKeys } = parsed.data;

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(status ? { status } : {}),
    },
  });

  if (roleKeys) {
    // Replace role assignments (system roles preserved if present in list)
    await db.userRoleAssignment.deleteMany({ where: { userId } });
    const roles = await db.role.findMany({ where: { key: { in: roleKeys } } });
    for (const r of roles) {
      await db.userRoleAssignment.create({
        data: { userId, roleId: r.id },
      });
    }
  }

  await logger.audit({
    userId: guard.user.id,
    action: "admin.user.update",
    category: "admin",
    resourceId: userId,
    metadata: parsed.data,
  });
  return NextResponse.json({ user: updated });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin(req, "admin:users:write");
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (userId === guard.user.id)
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  await db.user.delete({ where: { id: userId } });
  await logger.audit({
    userId: guard.user.id,
    action: "admin.user.delete",
    category: "admin",
    resourceId: userId,
  });
  return NextResponse.json({ ok: true });
}
