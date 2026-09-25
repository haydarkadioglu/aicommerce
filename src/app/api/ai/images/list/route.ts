import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import fs from "fs";

/**
 * List generated images for the current user.
 * Reads from AiUsage where endpoint='image' and the persisted file path
 * exists. Returns base64 data URLs so the UI can render without a fetch.
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "12"), 24);

  const usages = await db.aiUsage.findMany({
    where: {
      userId: user.id,
      endpoint: "image",
      success: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      modelId: true,
      latencyMs: true,
      createdAt: true,
      metadata: true,
    },
  });

  const images = [];
  for (const u of usages) {
    let prompt = "";
    let size = "1024x1024";
    let dataUrl: string | null = null;
    if (u.metadata) {
      try {
        const meta = JSON.parse(u.metadata);
        prompt = meta.prompt || "";
        size = meta.size || "1024x1024";
        const filePath = meta.filePath;
        if (filePath && fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          const base64 = buffer.toString("base64");
          dataUrl = `data:image/png;base64,${base64}`;
        }
      } catch {
        // ignore
      }
    }
    if (dataUrl) {
      images.push({
        id: u.id,
        prompt,
        size,
        latencyMs: u.latencyMs,
        createdAt: u.createdAt,
        dataUrl,
      });
    }
  }

  return NextResponse.json({ images });
}
