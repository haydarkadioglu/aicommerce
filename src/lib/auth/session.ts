import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import type { User, Role, Permission } from "@prisma/client";

const AUTH_SECRET =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 30;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  roles: string[];
  permissions: string[];
};

export type SessionPayload = {
  sub: string;
  email: string;
  name: string | null;
  image: string | null;
  roles: string[];
  permissions: string[];
  type: "access" | "refresh";
  jti: string;
};

export async function issueSession(user: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}) {
  const { roles, permissions } = await loadUserPermissions(user.id);

  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      roles,
      permissions,
      type: "access",
      jti: nanoid(16),
    } satisfies SessionPayload,
    AUTH_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  const refreshTokenValue = nanoid(48);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await db.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: toAuthUser(user, roles, permissions),
    expiresIn: 15 * 60,
  };
}

export async function loadUserPermissions(userId: string): Promise<{
  roles: string[];
  permissions: string[];
}> {
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

  const roles = assignments.map((a) => a.role.key);
  const permissionSet = new Set<string>();
  for (const a of assignments) {
    for (const rp of a.role.permissions) {
      permissionSet.add(rp.permission.key);
    }
  }

  return { roles, permissions: Array.from(permissionSet) };
}

export async function verifyAccessToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = jwt.verify(token, AUTH_SECRET) as SessionPayload;
    if (payload.type !== "access") return null;
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, image: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") return null;

    // Always re-load live permissions so role changes apply immediately.
    const { roles, permissions } = await loadUserPermissions(user.id);
    return toAuthUser(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      roles,
      permissions
    );
  } catch {
    return null;
  }
}

export async function rotateRefreshToken(token: string) {
  const existing = await db.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!existing) return null;
  if (existing.revokedAt) return null;
  if (existing.expiresAt < new Date()) return null;
  if (existing.user.status !== "ACTIVE") return null;

  // Revoke the old refresh token (rotation)
  await db.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  return issueSession({
    id: existing.user.id,
    email: existing.user.email,
    name: existing.user.name,
    image: existing.user.image,
  });
}

export async function revokeAllUserSessions(userId: string) {
  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function toAuthUser(
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  },
  roles: string[],
  permissions: string[]
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    roles,
    permissions,
  };
}

export async function getUserFromRequest(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    // Try cookie fallback
    const cookieHeader = req.headers.get("cookie") || "";
    const accessMatch = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("access_token="));
    if (!accessMatch) return null;
    const cookieToken = accessMatch.split("=")[1];
    return verifyAccessToken(cookieToken);
  }
  return verifyAccessToken(token);
}

export function requirePermission(user: AuthUser | null, permission: string) {
  if (!user) return false;
  if (user.roles.includes("admin")) return true;
  return user.permissions.includes(permission);
}
