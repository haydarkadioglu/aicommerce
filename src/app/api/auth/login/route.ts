import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak whether email exists
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Lock check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        {
          error:
            "Account temporarily locked due to too many failed attempts. Try again later.",
        },
        { status: 423 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is not active. Please contact an administrator." },
        { status: 403 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Password not set for this account" },
        { status: 400 }
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      const newFailCount = user.failedLoginCount + 1;
      const shouldLock = newFailCount >= MAX_FAILED_ATTEMPTS;
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: newFailCount,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCK_DURATION_MS)
            : null,
        },
      });
      await logger.audit({
        userId: user.id,
        action: "user.login.failed",
        category: "auth",
        severity: "warning",
        metadata: { attempts: newFailCount },
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Success — reset counters
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const session = await issueSession({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    });

    await logger.audit({
      userId: user.id,
      action: "user.login.success",
      category: "auth",
      ipAddress: req.headers.get("x-real-ip") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

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
  } catch (err) {
    logger.error("api", "Login failed", { error: String(err) });
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
