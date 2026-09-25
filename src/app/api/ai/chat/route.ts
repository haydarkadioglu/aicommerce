import { NextResponse } from "next/server";
import { getUserFromRequest, requirePermission } from "@/lib/auth/session";
import { orchestrator } from "@/lib/ai/orchestrator";
import { logger } from "@/lib/logger";
import { checkAiCallLimit } from "@/lib/subscription";
import { z } from "zod";
import type { ChatMessage } from "@/lib/ai/providers";

const ChatSchema = z.object({
  agentKey: z.string().default("general"),
  message: z.string().min(1).max(8000),
  conversationId: z.string().optional(),
  variables: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  options: z
    .object({
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      model: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requirePermission(user, "ai:chat")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check plan-based usage limits
  const usageCheck = await checkAiCallLimit(user.id);
  if (!usageCheck.allowed) {
    await logger.audit({
      userId: user.id,
      action: "ai.chat.blocked.limit",
      category: "ai",
      severity: "warning",
      metadata: {
        used: usageCheck.used,
        limit: usageCheck.limit,
        plan: usageCheck.planKey,
      },
    });
    return NextResponse.json(
      {
        error: usageCheck.reason || "AI call limit reached",
        code: "USAGE_LIMIT_REACHED",
        used: usageCheck.used,
        limit: usageCheck.limit,
        plan: usageCheck.planKey,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { agentKey, message, conversationId, variables, options } =
      parsed.data;

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: message,
      },
    ];

    const result = await orchestrator.chat({
      userId: user.id,
      agentKey,
      conversationId,
      messages,
      variables,
      options,
      rememberOutcome: true,
    });

    await logger.audit({
      userId: user.id,
      action: "ai.chat",
      category: "ai",
      metadata: {
        agentKey,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      },
    });

    return NextResponse.json({
      content: result.content,
      model: result.model,
      provider: result.provider,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      latencyMs: result.latencyMs,
      usageId: result.usageId,
      conversationId: (result as any).conversationId,
      agentKey,
    });
  } catch (err) {
    logger.error("api", "AI chat failed", { error: String(err) });
    return NextResponse.json(
      { error: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}
