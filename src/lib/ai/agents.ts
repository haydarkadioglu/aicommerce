import { db } from "@/lib/db";
import { orchestrator } from "./orchestrator";
import type { ChatMessage } from "./providers";

/**
 * AI Agent Registry
 * -----------------
 * Each agent is a thin wrapper that knows its key + how to build a
 * sensible default prompt. The orchestrator does the heavy lifting.
 *
 * Adding a new agent only requires:
 *   - Inserting a row in `AiAgent`
 *   - (optional) Adding a typed wrapper class here for ergonomics
 */

export type AgentRunInput = {
  userId?: string;
  conversationId?: string;
  messages: ChatMessage[];
  variables?: Record<string, string | number | undefined>;
  options?: { temperature?: number; maxTokens?: number; model?: string };
};

export type AgentRunResult = {
  content: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  usageId: string;
  conversationId?: string;
};

async function runAgent(
  agentKey: string,
  input: AgentRunInput
): Promise<AgentRunResult> {
  const result = await orchestrator.chat({
    userId: input.userId,
    agentKey,
    conversationId: input.conversationId,
    messages: input.messages,
    variables: input.variables,
    modelOverride: input.options?.model,
    options: {
      temperature: input.options?.temperature,
      maxTokens: input.options?.maxTokens,
    },
  });
  return {
    content: result.content,
    model: result.model,
    provider: result.provider,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    latencyMs: result.latencyMs,
    usageId: result.usageId,
    conversationId: (result as any).conversationId,
  };
}

export const agents = {
  general: (input: AgentRunInput) => runAgent("general", input),
  research: (input: AgentRunInput) => runAgent("research", input),
  seo: (input: AgentRunInput) => runAgent("seo", input),
  trend: (input: AgentRunInput) => runAgent("trend", input),
  listing: (input: AgentRunInput) => runAgent("listing", input),
  supplier: (input: AgentRunInput) => runAgent("supplier", input),
  profit: (input: AgentRunInput) => runAgent("profit", input),
  pricing: (input: AgentRunInput) => runAgent("pricing", input),
  similarity: (input: AgentRunInput) => runAgent("similarity", input),
  vision: (input: AgentRunInput) => runAgent("vision", input),
  prompt: (input: AgentRunInput) => runAgent("prompt", input),
  strategy: (input: AgentRunInput) => runAgent("strategy", input),
};

export async function listAgents() {
  return db.aiAgent.findMany({
    where: { isActive: true },
    orderBy: { category: "asc" },
  });
}
