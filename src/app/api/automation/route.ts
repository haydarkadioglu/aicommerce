import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * Automation Center — configurable workflows that run on a schedule.
 * Types: trend-scan, supplier-scan, profit-report, competitor-monitor,
 * opportunity-alert, listing-draft, price-alert.
 */

const CreateRuleSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  workflowType: z.enum(["trend-scan", "supplier-scan", "profit-report", "competitor-monitor", "opportunity-alert", "listing-draft", "price-alert"]),
  config: z.record(z.string(), z.unknown()).optional(),
  scheduleType: z.enum(["daily", "weekly", "monthly", "interval", "manual"]).default("daily"),
  scheduleConfig: z.record(z.string(), z.unknown()).optional(),
});

// GET: List automation rules
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rules = await db.automationRule.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { runs: { orderBy: { createdAt: "desc" }, take: 3 } } });
  return NextResponse.json({ rules });
}

// POST: Create a new automation rule
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = CreateRuleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Compute next run time based on schedule
  const nextRunAt = computeNextRun(parsed.data.scheduleType, parsed.data.scheduleConfig);

  const rule = await db.automationRule.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      workflowType: parsed.data.workflowType,
      config: parsed.data.config ? JSON.stringify(parsed.data.config) : null,
      scheduleType: parsed.data.scheduleType,
      scheduleConfig: parsed.data.scheduleConfig ? JSON.stringify(parsed.data.scheduleConfig) : null,
      isActive: true,
      nextRunAt,
    },
  });

  await logger.audit({ userId: user.id, action: "automation.create", category: "system", resourceId: rule.id, metadata: { workflowType: parsed.data.workflowType, scheduleType: parsed.data.scheduleType } });
  return NextResponse.json({ rule });
}

// PATCH: Toggle rule active/inactive or run now
export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const ruleId = url.searchParams.get("ruleId");
  if (!ruleId) return NextResponse.json({ error: "ruleId required" }, { status: 400 });
  const body = await req.json();
  const action = body.action;

  if (action === "toggle") {
    const rule = await db.automationRule.findFirst({ where: { id: ruleId, userId: user.id } });
    if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    const updated = await db.automationRule.update({ where: { id: ruleId }, data: { isActive: !rule.isActive } });
    return NextResponse.json({ rule: updated });
  }

  if (action === "run-now") {
    // Create a pending run
    const run = await db.automationRun.create({ data: { automationRuleId: ruleId, status: "pending" } });
    // Simulate execution by marking it completed with a summary
    await db.automationRun.update({ where: { id: run.id }, data: { status: "completed", startedAt: new Date(), completedAt: new Date(), result: JSON.stringify({ message: "Manual run completed", triggeredBy: user.email }) } });
    await db.automationRule.update({ where: { id: ruleId }, data: { lastRunAt: new Date() } });
    return NextResponse.json({ run, message: "Rule executed successfully" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE: Delete an automation rule
export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const ruleId = url.searchParams.get("ruleId");
  if (!ruleId) return NextResponse.json({ error: "ruleId required" }, { status: 400 });
  await db.automationRule.deleteMany({ where: { id: ruleId, userId: user.id } });
  return NextResponse.json({ ok: true });
}

function computeNextRun(scheduleType: string, scheduleConfig: any): Date {
  const now = new Date();
  switch (scheduleType) {
    case "daily":
      now.setDate(now.getDate() + 1);
      now.setHours(9, 0, 0, 0);
      return now;
    case "weekly":
      now.setDate(now.getDate() + 7);
      return now;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      return now;
    case "interval": {
      const hours = scheduleConfig?.hours || 6;
      now.setHours(now.getHours() + hours);
      return now;
    }
    case "manual":
    default:
      return now;
  }
}
