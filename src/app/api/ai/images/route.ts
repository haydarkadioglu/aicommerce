import { NextResponse } from "next/server";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const SUPPORTED_SIZES = [
  "1024x1024",
  "768x1344",
  "864x1152",
  "1344x768",
  "1152x864",
  "1440x720",
  "720x1440",
];

const GenerateSchema = z.object({
  prompt: z.string().min(3).max(1500),
  size: z.string().default("1024x1024"),
});

let zaiPromise: Promise<ZAI> | null = null;
async function getZAI() {
  if (!zaiPromise) {
    zaiPromise = ZAI.create();
  }
  return zaiPromise;
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Image Studio requires ai:chat (re-uses AI budget)
  if (!requirePermission(user, "ai:chat")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  if (!SUPPORTED_SIZES.includes(parsed.data.size)) {
    return NextResponse.json(
      {
        error: `Unsupported size. Use one of: ${SUPPORTED_SIZES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const started = Date.now();
  try {
    const zai = await getZAI();
    const response = await (zai.images.generations.create as any)({
      prompt: parsed.data.prompt,
      size: parsed.data.size,
    });

    const imageBase64: string = response?.data?.[0]?.base64;
    if (!imageBase64) {
      throw new Error("No image data returned from provider");
    }

    // Persist image to /download dir so it can be served back to the user
    const downloadDir = "/home/z/my-project/download";
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    const imageDir = path.join(downloadDir, "images");
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    const filename = `img-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.png`;
    const fullPath = path.join(imageDir, filename);
    const buffer = Buffer.from(imageBase64, "base64");
    fs.writeFileSync(fullPath, buffer);

    // Save base64 for the response too (so the UI can show it without a fetch)
    const dataUrl = `data:image/png;base64,${imageBase64}`;
    const latencyMs = Date.now() - started;

    // Track in AI usage
    await db.aiUsage.create({
      data: {
        userId: user.id,
        agentKey: "vision",
        modelId: "zai-image",
        endpoint: "image",
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        latencyMs,
        success: true,
        metadata: JSON.stringify({
          prompt: parsed.data.prompt.slice(0, 200),
          size: parsed.data.size,
          filePath: fullPath,
        }),
      },
    });

    await logger.audit({
      userId: user.id,
      action: "ai.image.generate",
      category: "ai",
      metadata: { size: parsed.data.size, latencyMs },
    });

    return NextResponse.json({
      image: dataUrl,
      path: `/download/images/${filename}`,
      size: parsed.data.size,
      latencyMs,
    });
  } catch (err: any) {
    logger.error("api", "Image generation failed", { error: String(err) });
    // Track failure + notify user
    await db.aiUsage.create({
      data: {
        userId: user.id,
        agentKey: "vision",
        modelId: "zai-image",
        endpoint: "image",
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        latencyMs: Date.now() - started,
        success: false,
        errorMessage: String(err).slice(0, 500),
      },
    });
    await notify({
      userId: user.id,
      type: "error",
      title: "Image generation failed",
      message: String(err).slice(0, 200) || "Could not generate the image.",
    });
    return NextResponse.json(
      { error: "Image generation failed. Please try again." },
      { status: 500 }
    );
  }
}
