import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updatePromptContent } from "@/lib/ai/prompts";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function GET(req: Request) {
  const guard = await requireAdmin(req, "admin:prompts:read");
  if (!guard.ok) return guard.response;
  const prompts = await db.prompt.findMany({
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 5,
      },
      _count: { select: { versions: true } },
    },
    orderBy: { category: "asc" },
  });
  return NextResponse.json({ prompts });
}

const UpdateSchema = z.object({
  key: z.string(),
  content: z.string(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const guard = await requireAdmin(req, "admin:prompts:write");
  if (!guard.ok) return guard.response;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  const version = await updatePromptContent(
    parsed.data.key,
    parsed.data.content,
    parsed.data.notes,
    guard.user.id
  );
  await logger.audit({
    userId: guard.user.id,
    action: "admin.prompt.update",
    category: "admin",
    resourceId: version.promptId,
    metadata: { key: parsed.data.key, version: version.version },
  });
  return NextResponse.json({ version });
}
