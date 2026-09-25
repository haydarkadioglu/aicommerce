import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const flags = await db.featureFlag.findMany({
    select: { key: true, name: true, description: true, enabled: true },
  });
  return NextResponse.json({ flags });
}
