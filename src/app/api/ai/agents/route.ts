import { NextResponse } from "next/server";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { listAgents } from "@/lib/ai/agents";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "ai:agents:list")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const agents = await listAgents();
  return NextResponse.json({ agents });
}
