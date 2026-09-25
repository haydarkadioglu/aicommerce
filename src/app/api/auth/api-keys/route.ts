import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { nanoid } from "nanoid";
import { z } from "zod";

const KEY_PREFIX = "aco_"; // ai-commerce-os
const KEY_LENGTH = 36;

async function hashKey(key: string): Promise<string> {
  // Simple SHA-256 hashing using the Web Crypto API (server-side).
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key)
  );
  return Buffer.from(new Uint8Array(buf)).toString("hex");
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKeys = await db.apiKey.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPreview: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ apiKeys });
}

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  // Generate a raw key — only shown ONCE to the user.
  const rawKey = `${KEY_PREFIX}${nanoid(KEY_LENGTH)}`;
  const keyHash = await hashKey(rawKey);
  const keyPreview = rawKey.slice(-6);
  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 86400_000)
    : null;

  const apiKey = await db.apiKey.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      keyHash,
      keyPreview,
      scopes: parsed.data.scopes || null,
      expiresAt,
    },
    select: {
      id: true,
      name: true,
      keyPreview: true,
      scopes: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  await logger.audit({
    userId: user.id,
    action: "user.apikey.create",
    category: "auth",
    metadata: { name: parsed.data.name },
  });
  // Return raw key once
  return NextResponse.json({ apiKey, rawKey });
}

export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const keyId = url.searchParams.get("keyId");
  if (!keyId) {
    return NextResponse.json({ error: "keyId required" }, { status: 400 });
  }
  await db.apiKey.updateMany({
    where: { id: keyId, userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await logger.audit({
    userId: user.id,
    action: "user.apikey.revoke",
    category: "auth",
    resourceId: keyId,
  });
  return NextResponse.json({ ok: true });
}
