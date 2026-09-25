import { getUserFromRequest, requirePermission, type AuthUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function requireAdmin(req: Request, permission: string): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; response: Response }
> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!requirePermission(user, permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, user };
}
