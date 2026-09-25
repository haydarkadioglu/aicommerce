/**
 * AI Provider Abstraction Layer
 * --------------------------------
 * Every provider implements the same interface so the rest of the
 * system (orchestrator, agents, API) is provider-agnostic. Adding a
 * new provider (OpenAI, Gemini, Claude, Grok, OpenRouter, DeepSeek,
 * Mistral, Cohere, local models…) only requires:
 *   1. Inserting a row into `AiProvider` / `AiModel`
 *   2. (optional) implementing a custom adapter class below.
 *
 * The default provider (z-ai) uses the bundled z-ai-web-dev-sdk.
 */

import ZAI from "z-ai-web-dev-sdk";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ChatOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  topP?: number;
  stop?: string[];
  signal?: AbortSignal;
};

export type ChatResponse = {
  content: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  raw?: unknown;
};

export type EmbeddingResponse = {
  embedding: number[];
  tokens: number;
  model: string;
  provider: string;
};

export interface AIProviderAdapter {
  key: string;
  chat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse>;
  embeddings?(input: string, model?: string): Promise<EmbeddingResponse>;
}

// ============================================================
// Default Provider: z-ai-web-dev-sdk
// ============================================================

export class ZAIProvider implements AIProviderAdapter {
  key = "zai";
  private clientPromise: Promise<ZAI> | null = null;

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = ZAI.create();
    }
    return this.clientPromise;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const started = Date.now();
    const sdk = await this.client();

    // z-ai sdk.chat.completions.create({ messages, model })
    // The SDK supports an OpenAI-like API surface.
    const finalMessages = (
      options?.systemPrompt
        ? [{ role: "system" as const, content: options.systemPrompt }, ...messages]
        : messages
    ).map((m) => ({ role: m.role, content: m.content }));

    // Use a permissive call so unknown options don't break the SDK.
    const response = (await (sdk.chat.completions.create as any)({
      messages: finalMessages,
      model: options?.model,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      stream: false,
    })) as any;

    const choice = response?.choices?.[0] ?? {};
    const content: string =
      choice?.message?.content ??
      choice?.delta?.content ??
      (typeof response?.text === "string" ? response.text : "");
    const usage = response?.usage ?? {};
    const tokensIn = Number(usage?.prompt_tokens ?? 0) || content.length / 4;
    const tokensOut =
      Number(usage?.completion_tokens ?? 0) || content.length / 4;

    return {
      content: content || "",
      model: options?.model || "zai-default",
      provider: this.key,
      tokensIn: Math.ceil(tokensIn),
      tokensOut: Math.ceil(tokensOut),
      latencyMs: Date.now() - started,
      raw: response,
    };
  }
}

// ============================================================
// Generic OpenAI-Compatible Adapter (for OpenAI, OpenRouter,
// DeepSeek, Mistral, Grok xAI, etc.). All these providers expose
// an OpenAI-compatible /v1/chat/completions endpoint, so we can
// route to them dynamically using config stored in the DB.
// ============================================================

export class OpenAICompatibleProvider implements AIProviderAdapter {
  key: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(opts: { key: string; apiKey: string; baseUrl: string }) {
    this.key = opts.key;
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const started = Date.now();
    const body: Record<string, unknown> = {
      model: options?.model,
      messages: (
        options?.systemPrompt
          ? [{ role: "system", content: options.systemPrompt }, ...messages]
          : messages
      ).map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      stop: options?.stop,
      stream: false,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Provider ${this.key} error ${response.status}: ${text}`);
    }
    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    const usage = json?.usage ?? {};
    return {
      content,
      model: options?.model || json?.model || this.key,
      provider: this.key,
      tokensIn: Number(usage.prompt_tokens ?? 0),
      tokensOut: Number(usage.completion_tokens ?? 0),
      latencyMs: Date.now() - started,
      raw: json,
    };
  }
}

// ============================================================
// Provider Registry (runtime cache of provider instances)
// ============================================================

const providerCache = new Map<string, AIProviderAdapter>();

export function getProviderAdapter(opts: {
  key: string;
  apiKey?: string;
  baseUrl?: string;
}): AIProviderAdapter {
  const cacheKey = opts.key;
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }
  let adapter: AIProviderAdapter;
  if (opts.key === "zai") {
    adapter = new ZAIProvider();
  } else if (opts.apiKey && opts.baseUrl) {
    adapter = new OpenAICompatibleProvider({
      key: opts.key,
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
    });
  } else {
    // Fallback to zai for unknown providers without configured keys.
    adapter = new ZAIProvider();
  }
  providerCache.set(cacheKey, adapter);
  return adapter;
}

export function clearProviderCache() {
  providerCache.clear();
}
