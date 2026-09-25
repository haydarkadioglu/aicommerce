import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().optional().or(z.literal("")),
});

export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const data: { name?: string; image?: string | null } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.image !== undefined)
    data.image = parsed.data.image === "" ? null : parsed.data.image;
  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true, image: true },
  });
  await logger.audit({
    userId: user.id,
    action: "user.profile.update",
    category: "auth",
    metadata: { fields: Object.keys(data) },
  });
  return NextResponse.json({ user: updated });
}
