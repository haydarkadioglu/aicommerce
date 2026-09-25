import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notify";
import {
  AIProviderAdapter,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  getProviderAdapter,
} from "./providers";
import { renderPrompt, resolvePrompt } from "./prompts";
import { recall, remember } from "./memory";

/**
 * AI Orchestrator
 * ----------------
 * Every AI call in the platform goes through this single class:
 *
 *  1. Resolves the agent (which prompt to use, which model, which
 *     capabilities).
 *  2. Picks the best provider from DB configuration (default +
 *     fallback chain).
 *  3. Loads the latest prompt version from the Prompt Engine.
 *  4. Hydrates memory from the user's history.
 *  5. Calls the provider through the provider abstraction layer.
 *  6. Applies retry logic + error handling.
 *  7. Normalizes the response, tracks usage + cost, logs the call,
 *     optionally persists a memory snapshot.
 *
 * Modular: agents, providers, prompts, and memory can all be
 * replaced/augmented without changing the orchestrator code.
 */

export type OrchestratorChatInput = {
  userId?: string;
  agentKey: string; // e.g. "listing", "research", "general"
  messages: ChatMessage[];
  variables?: Record<string, string | number | undefined>;
  modelOverride?: string;
  providerOverride?: string;
  conversationId?: string;
  options?: ChatOptions;
  rememberOutcome?: boolean;
};

export type OrchestratorResult = ChatResponse & {
  agentKey: string;
  usageId: string;
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

export class AIOrchestrator {
  async chat(input: OrchestratorChatInput): Promise<OrchestratorResult> {
    const agent = await db.aiAgent.findUnique({
      where: { key: input.agentKey },
    });
    if (!agent || !agent.isActive)
      throw new Error(`Agent ${input.agentKey} not available`);

    // Resolve system prompt
    let systemPrompt = input.options?.systemPrompt || "";
    if (!systemPrompt && agent.systemPromptKey) {
      const resolved = await resolvePrompt(agent.systemPromptKey);
      if (resolved) {
        systemPrompt = renderPrompt(resolved.content, input.variables || {});
      }
    } else if (systemPrompt) {
      systemPrompt = renderPrompt(systemPrompt, input.variables || {});
    }

    // Hydrate memory
    let memoryPrefix = "";
    if (input.userId) {
      const facts = await recall({
        userId: input.userId,
        agentKey: input.agentKey,
        limit: 5,
      });
      if (facts.length) {
        memoryPrefix =
          "\n\n[Memory]\n" +
          facts.map((f) => `- ${f}`).join("\n") +
          "\n";
      }
    }

    const finalSystemPrompt = systemPrompt + memoryPrefix;

    // Pick provider
    const { providerAdapter, providerKey, modelId } = await this.pickProvider(
      input.providerOverride,
      agent.defaultModel
    );

    // Persist user message (if conversation is bound)
    let conversationId = input.conversationId;
    if (input.userId && !conversationId) {
      const conv = await db.aiConversation.create({
        data: {
          userId: input.userId,
          agentKey: input.agentKey,
          title: input.messages[0]?.content?.slice(0, 80) || "New chat",
        },
      });
      conversationId = conv.id;
    }

    if (conversationId) {
      const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
      if (lastUser) {
        await db.aiMessage.create({
          data: {
            conversationId,
            role: "user",
            content: lastUser.content,
          },
        });
      }
    }

    // Call provider with retry
    const result = await this.callWithRetry(providerAdapter, input.messages, {
      ...input.options,
      systemPrompt: finalSystemPrompt || undefined,
      model: input.modelOverride || modelId || undefined,
    });

    // Persist assistant message
    if (conversationId) {
      await db.aiMessage.create({
        data: {
          conversationId,
          role: "assistant",
          content: result.content,
          model: result.model,
          providerKey,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: 0,
          latencyMs: result.latencyMs,
          isError: !result.content,
        },
      });
    }

    // Track usage + cost
    const usage = await this.trackUsage({
      userId: input.userId,
      agentKey: input.agentKey,
      providerKey,
      modelId: result.model,
      result,
    });

    if (input.rememberOutcome && input.userId && result.content) {
      await remember({
        userId: input.userId,
        agentKey: input.agentKey,
        kind: "context",
        content: result.content.slice(0, 500),
        importance: 0.3,
      });
    }

    return {
      ...result,
      agentKey: input.agentKey,
      usageId: usage.id,
      conversationId: conversationId,
    } as OrchestratorResult & { conversationId?: string };
  }

  private async pickProvider(
    override?: string,
    preferredModel?: string | null
  ): Promise<{
    providerAdapter: AIProviderAdapter;
    providerKey: string;
    modelId?: string;
  }> {
    // If user/admin overrode a provider, use it directly
    if (override) {
      const provider = await db.aiProvider.findUnique({
        where: { key: override },
        include: { models: { where: { isActive: true } } },
      });
      if (provider && provider.isActive) {
        const model = preferredModel
          ? provider.models.find((m) => m.modelId === preferredModel)
          : provider.models.find((m) => m.isDefault) || provider.models[0];
        const adapter = this.adapterFromProvider(provider);
        return {
          providerAdapter: adapter,
          providerKey: provider.key,
          modelId: model?.modelId,
        };
      }
    }

    // Default chain: default provider first, then any other active.
    const providers = await db.aiProvider.findMany({
      where: { isActive: true },
      include: { models: { where: { isActive: true } } },
      orderBy: { isDefault: "desc" },
    });
    if (providers.length === 0) {
      // Hard fallback to z-ai adapter (bundled, no DB config needed)
      return {
        providerAdapter: getProviderAdapter({ key: "zai" }),
        providerKey: "zai",
        modelId: undefined,
      };
    }
    const provider = providers[0];
    const model = preferredModel
      ? provider.models.find((m) => m.modelId === preferredModel)
      : provider.models.find((m) => m.isDefault) || provider.models[0];
    const adapter = this.adapterFromProvider(provider);
    return {
      providerAdapter: adapter,
      providerKey: provider.key,
      modelId: model?.modelId,
    };
  }

  private adapterFromProvider(p: {
    key: string;
    baseUrl: string | null;
    config: string | null;
  }): AIProviderAdapter {
    let apiKey: string | undefined;
    if (p.config) {
      try {
        const cfg = JSON.parse(p.config) as { apiKey?: string };
        apiKey = cfg.apiKey;
      } catch {
        // ignore
      }
    }
    return getProviderAdapter({
      key: p.key,
      apiKey,
      baseUrl: p.baseUrl || undefined,
    });
  }

  private async callWithRetry(
    adapter: AIProviderAdapter,
    messages: ChatMessage[],
    options: ChatOptions
  ): Promise<ChatResponse> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await adapter.chat(messages, options);
      } catch (err) {
        lastError = err;
        logger.warn("orchestrator", `AI call attempt ${attempt + 1} failed`, {
          error: String(err),
        });
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    // Final fallback: return an error-shaped response so the platform
    // never crashes — caller can show a friendly message.
    logger.error("orchestrator", "AI call failed after retries", {
      error: String(lastError),
    });
    return {
      content:
        "I apologize — I had trouble reaching the AI service. Please try again in a moment.",
      model: options.model || "unknown",
      provider: "orchestrator-fallback",
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: 0,
    };
  }

  private async trackUsage(input: {
    userId?: string;
    agentKey: string;
    providerKey: string;
    modelId?: string;
    result: ChatResponse;
  }) {
    let providerRow = await db.aiProvider.findUnique({
      where: { key: input.providerKey },
    });
    let modelRow = input.modelId
      ? await db.aiModel.findUnique({
          where: {
            providerId_modelId: {
              providerId: providerRow?.id || "",
              modelId: input.modelId,
            },
          },
        }).catch(() => null)
      : null;

    // Compute cost
    let costUsd = 0;
    if (modelRow) {
      costUsd =
        (input.result.tokensIn / 1000) * modelRow.inputCostPer1k +
        (input.result.tokensOut / 1000) * modelRow.outputCostPer1k;
    }

    return db.aiUsage
      .create({
        data: {
          userId: input.userId || null,
          providerId: providerRow?.id || null,
          agentKey: input.agentKey,
          modelId: input.modelId || input.result.model,
          endpoint: "chat",
          tokensIn: input.result.tokensIn,
          tokensOut: input.result.tokensOut,
          costUsd,
          latencyMs: input.result.latencyMs,
          success: !!input.result.content,
        },
      })
      .then(async (usage) => {
        // Fire-and-forget side-effects
        if (input.userId) {
          // Notify on failed AI call
          if (!input.result.content) {
            await notify({
              userId: input.userId,
              type: "error",
              title: "AI request failed",
              message: `Agent "${input.agentKey}" could not complete the request. The system tried retries and fell back to a placeholder. Please try again in a moment.`,
              link: "/?view=ai-assistant",
            });
          }
          // Milestone check: count user's total AI calls today
          try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const todayCount = await db.aiUsage.count({
              where: {
                userId: input.userId,
                createdAt: { gte: startOfDay },
              },
            });
            // Fire milestone notifications at 10, 50, 100, 500 calls
            const milestone = [10, 50, 100, 500].find(
              (m) => m === todayCount
            );
            if (milestone) {
              await notify({
                userId: input.userId,
                type: "success",
                title: `${milestone} AI calls today`,
                message: `You've made ${milestone} AI calls today. Review your usage in the dashboard.`,
                link: "/?view=dashboard",
              });
            }
          } catch {
            // ignore
          }
        }
        return usage;
      });
  }
}

export const orchestrator = new AIOrchestrator();
