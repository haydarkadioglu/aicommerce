import { NextResponse } from "next/server";
import { rotateRefreshToken } from "@/lib/auth/session";

export async function POST(req: Request) {
  let refreshToken: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    refreshToken = body?.refreshToken;
  } catch {
    // ignore
  }
  if (!refreshToken) {
    // Try cookie
    const cookie = req.headers.get("cookie") || "";
    const match = cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("refresh_token="));
    refreshToken = match?.split("=")[1];
  }
  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 400 });
  }
  const session = await rotateRefreshToken(refreshToken);
  if (!session) {
    return NextResponse.json(
      { error: "Refresh token invalid or expired" },
      { status: 401 }
    );
  }
  const response = NextResponse.json({
    user: session.user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
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
