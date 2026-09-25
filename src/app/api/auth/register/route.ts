import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, isPasswordStrong } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { z } from "zod";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { email, password, name } = parsed.data;

    const strength = isPasswordStrong(password);
    if (!strength.ok) {
      return NextResponse.json({ error: strength.reason }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });

    // Assign default "user" role
    const userRole = await db.role.findUnique({ where: { key: "user" } });
    if (userRole) {
      await db.userRoleAssignment.create({
        data: { userId: user.id, roleId: userRole.id },
      });
    }

    const session = await issueSession({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    });

    await logger.audit({
      userId: user.id,
      action: "user.register",
      category: "auth",
      metadata: { email },
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
    logger.error("api", "Register failed", { error: String(err) });
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
