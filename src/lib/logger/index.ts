import { db } from "@/lib/db";

/**
 * Lightweight in-process logger that also persists critical events
 * to the SystemLog and AuditLog tables. Designed to be future-proof:
 * can be swapped for a structured log sink (e.g. pino/winston) later.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogSource =
  | "auth"
  | "api"
  | "orchestrator"
  | "agent"
  | "job"
  | "system";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel = (process.env.LOG_LEVEL || "info") as LogLevel;

function shouldLog(level: LogLevel) {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

export const logger = {
  debug(source: LogSource, message: string, context?: Record<string, unknown>) {
    if (!shouldLog("debug")) return;
    console.debug(`[${source}] ${message}`, context ?? "");
    void persist("debug", source, message, context);
  },
  info(source: LogSource, message: string, context?: Record<string, unknown>) {
    console.log(`[${source}] ${message}`, context ?? "");
    void persist("info", source, message, context);
  },
  warn(source: LogSource, message: string, context?: Record<string, unknown>) {
    console.warn(`[${source}] ${message}`, context ?? "");
    void persist("warn", source, message, context);
  },
  error(source: LogSource, message: string, context?: Record<string, unknown>) {
    console.error(`[${source}] ${message}`, context ?? "");
    void persist("error", source, message, context);
  },
  async audit(input: {
    userId?: string;
    action: string;
    category?: string;
    resource?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    severity?: "debug" | "info" | "warning" | "error" | "critical";
  }) {
    try {
      await db.auditLog.create({
        data: {
          userId: input.userId || null,
          action: input.action,
          category: input.category || "general",
          resource: input.resource || null,
          resourceId: input.resourceId || null,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          severity: input.severity || "info",
        },
      });
    } catch (err) {
      console.error("Failed to write audit log", err);
    }
  },
};

async function persist(
  level: LogLevel,
  source: LogSource,
  message: string,
  context?: Record<string, unknown>
) {
  try {
    await db.systemLog.create({
      data: {
        level,
        source,
        message,
        context: context ? JSON.stringify(context) : null,
      },
    });
  } catch {
    // Never throw on logging
  }
}
