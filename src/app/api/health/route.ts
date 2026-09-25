import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Lightweight health check: count users
    await db.user.count();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  } catch (err) {
    return NextResponse.json(
      { status: "degraded", error: String(err) },
      { status: 503 }
    );
  }
}
