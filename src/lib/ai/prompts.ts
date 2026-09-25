import { db } from "@/lib/db";

/**
 * Prompt Engine — versioned, editable, DB-backed.
 * Prompts are referenced by `key` (e.g. "listing:title") and the
 * orchestrator resolves the current version automatically.
 *
 * Variables in the prompt body use the `{{variableName}}` syntax.
 * `renderPrompt` substitutes them safely.
 */

export async function resolvePrompt(key: string): Promise<{
  content: string;
  variables: string[];
  version: number;
} | null> {
  const prompt = await db.prompt.findUnique({
    where: { key },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1,
      },
    },
  });
  if (!prompt) return null;
  const version = prompt.versions[0];
  if (!version) return null;
  let variables: string[] = [];
  try {
    variables = version.variables ? JSON.parse(version.variables) : [];
  } catch {
    variables = [];
  }
  return { content: version.content, variables, version: version.version };
}

export function renderPrompt(
  template: string,
  vars: Record<string, string | number | undefined>
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? "" : String(value);
  });
}

export async function listPrompts() {
  return db.prompt.findMany({
    include: {
      _count: { select: { versions: true } },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    orderBy: { category: "asc" },
  });
}

export async function updatePromptContent(
  key: string,
  content: string,
  notes?: string,
  actor?: string
) {
  const prompt = await db.prompt.findUnique({
    where: { key },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!prompt) throw new Error(`Prompt ${key} not found`);
  const latestVersion = prompt.versions[0]?.version ?? 0;
  const nextVersion = latestVersion + 1;

  // Mark all previous as non-current.
  await db.promptVersion.updateMany({
    where: { promptId: prompt.id, isCurrent: true },
    data: { isCurrent: false },
  });

  const variables = extractVariables(content);
  const created = await db.promptVersion.create({
    data: {
      promptId: prompt.id,
      version: nextVersion,
      content,
      variables: JSON.stringify(variables),
      notes,
      isCurrent: true,
      createdBy: actor,
    },
  });
  return created;
}

export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{\s*(\w+)\s*\}\}/g);
  const set = new Set<string>();
  for (const m of matches) set.add(m[1]);
  return Array.from(set);
}
