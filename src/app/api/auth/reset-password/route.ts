import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { logger } from "@/lib/logger";

const RequestSchema = z.object({
  email: z.string().email(),
});

const ResetSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "reset") {
      const parsed = ResetSchema.safeParse(body);
      if (!parsed.success)
        return NextResponse.json(
          { error: "Invalid token or password" },
          { status: 400 }
        );
      const { token, password } = parsed.data;
      const reset = await db.passwordReset.findUnique({ where: { token } });
      if (!reset || reset.expiresAt < new Date() || reset.usedAt) {
        return NextResponse.json(
          { error: "Token invalid or expired" },
          { status: 400 }
        );
      }
      const { hashPassword } = await import("@/lib/auth/password");
      const strength = (await import("@/lib/auth/password")).isPasswordStrong(
        password
      );
      if (!strength.ok)
        return NextResponse.json({ error: strength.reason }, { status: 400 });
      const passwordHash = await hashPassword(password);
      await db.user.update({
        where: { id: reset.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      });
      await db.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      });
      await logger.audit({
        userId: reset.userId,
        action: "user.password.reset",
        category: "auth",
      });
      return NextResponse.json({ ok: true });
    }

    // Request reset
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    const { email } = parsed.data;
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      // Always issue token (don't leak whether email exists)
      const token = nanoid(48);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      await db.passwordReset.create({
        data: { userId: user.id, token, expiresAt },
      });
      await logger.audit({
        userId: user.id,
        action: "user.password.reset.requested",
        category: "auth",
        metadata: { tokenPreview: token.slice(0, 6) },
      });
      // In production we'd email the link. In this sandbox, return it so
      // the admin can see it in the response (only on success).
      const response = NextResponse.json({
        ok: true,
        // NOTE: only returned in non-production for testing.
        ...(process.env.NODE_ENV !== "production" ? { resetToken: token } : {}),
      });
      return response;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("api", "Password reset failed", { error: String(err) });
    return NextResponse.json(
      { error: "Password reset failed" },
      { status: 500 }
    );
  }
}
