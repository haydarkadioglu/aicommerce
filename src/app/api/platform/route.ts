import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const settings = await db.setting.findMany({
    where: { category: { in: ["general", "commerce"] } },
    select: { key: true, value: true },
  });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return NextResponse.json({ settings: map });
}
