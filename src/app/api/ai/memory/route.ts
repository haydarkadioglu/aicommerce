import { NextResponse } from "next/server";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { listUserMemory, remember, forget } from "@/lib/ai/memory";
import { z } from "zod";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "ai:memory:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const memory = await listUserMemory(user.id);
  return NextResponse.json({ memory });
}

const AddSchema = z.object({
  content: z.string().min(1),
  agentKey: z.string().optional(),
  kind: z.string().optional(),
  importance: z.number().min(0).max(1).optional(),
});

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "ai:memory:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const mem = await remember({
    userId: user.id,
    agentKey: parsed.data.agentKey,
    content: parsed.data.content,
    kind: parsed.data.kind,
    importance: parsed.data.importance,
  });
  return NextResponse.json({ memory: mem });
}

export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "ai:memory:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const memoryId = url.searchParams.get("memoryId");
  if (!memoryId) {
    return NextResponse.json({ error: "memoryId required" }, { status: 400 });
  }
  await forget(memoryId);
  return NextResponse.json({ ok: true });
}
