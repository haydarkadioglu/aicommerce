import { db } from "@/lib/db";

/**
 * AI Memory — short & long-term memory store keyed per user/agent.
 *
 * Memory is intentionally lightweight: it stores `kind` (fact /
 * preference / project / context) plus an importance score so the
 * agent can later recall relevant facts. Designed to be extended
 * with vector embeddings + retrieval (the column already exists).
 */

export async function remember(input: {
  userId: string;
  agentKey?: string;
  scope?: string;
  kind?: string;
  content: string;
  importance?: number;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}) {
  return db.aiMemory.create({
    data: {
      userId: input.userId,
      agentKey: input.agentKey || null,
      scope: input.scope || "user",
      kind: input.kind || "fact",
      content: input.content,
      importance: input.importance ?? 0.5,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      expiresAt: input.expiresAt ?? null,
    },
  });
}

export async function recall(input: {
  userId: string;
  agentKey?: string;
  kind?: string;
  limit?: number;
}): Promise<string[]> {
  const items = await db.aiMemory.findMany({
    where: {
      userId: input.userId,
      ...(input.agentKey
        ? {
            OR: [
              { agentKey: input.agentKey },
              { agentKey: null, scope: "user" },
              { scope: "global" },
            ],
          }
        : {}),
      ...(input.kind ? { kind: input.kind } : {}),
    },
    orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    take: input.limit ?? 8,
  });
  return items.map((m) => m.content);
}

export async function forget(memoryId: string) {
  return db.aiMemory.delete({ where: { id: memoryId } });
}

export async function listUserMemory(userId: string) {
  return db.aiMemory.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });
}
