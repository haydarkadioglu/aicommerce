import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { getUserFromRequest } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (user) {
    await revokeAllUserSessions(user.id);
    await logger.audit({
      userId: user.id,
      action: "user.logout",
      category: "auth",
    });
  }
  // Revoke any refresh token provided in body
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.refreshToken) {
      await db.refreshToken.updateMany({
        where: { token: body.refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  } catch {
    // ignore
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  return response;
}
