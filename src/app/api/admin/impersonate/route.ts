import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { issueSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * Admin "impersonate user" — issues a fresh session for the target user,
 * WITHOUT requiring their password. The acting admin's identity is
 * preserved in the audit log so actions taken during impersonation are
 * traceable.
 *
 * This is a sensitive operation — only admins with `admin:users:write`
 * can call it.
 */
const ImpersonateSchema = z.object({
  userId: z.string(),
});

export async function POST(req: Request) {
  const guard = await requireAdmin(req, "admin:users:write");
  if (!guard.ok) return guard.response;
  const body = await req.json();
  const parsed = ImpersonateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const target = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      status: true,
    },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.status !== "ACTIVE") {
    return NextResponse.json(
      { error: `Cannot impersonate user with status ${target.status}` },
      { status: 400 }
    );
  }

  const session = await issueSession({
    id: target.id,
    email: target.email,
    name: target.name,
    image: target.image,
  });

  await logger.audit({
    userId: guard.user.id,
    action: "admin.user.impersonate",
    category: "admin",
    severity: "warning",
    resourceId: target.id,
    metadata: {
      adminEmail: guard.user.email,
      targetEmail: target.email,
      targetId: target.id,
    },
  });

  // Also notify the target user that their account was impersonated
  // (transparency — they'll see it in their notifications next time they log in)
  try {
    const { notify } = await import("@/lib/notify");
    await notify({
      userId: target.id,
      type: "info",
      title: "Account accessed by admin",
      message: `An administrator (${guard.user.email}) accessed your account for support purposes at ${new Date().toLocaleString()}. If this wasn't you, please contact support.`,
    });
  } catch {
    // ignore notify failures
  }

  const response = NextResponse.json({
    user: session.user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    impersonatedBy: guard.user.email,
  });
  response.cookies.set("access_token", session.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: session.expiresIn,
    path: "/",
  });
  response.cookies.set("refresh_token", session.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
  return response;
}
